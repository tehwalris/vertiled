import * as glTiled from "gl-tiled";
import { produce } from "immer";
import * as R from "ramda";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Action,
  ActionType,
  ClientMessage,
  Coordinates,
  getLayer,
  initialState,
  LogEntry,
  MapWorld,
  MessageType,
  reducer,
  ServerMessage,
  unreachable,
} from "unilog-shared";
import { useImageStore } from "../image-store";
import { useWebSocket } from "../use-web-socket";
import { useSelection } from "../useSelection";
import { MapDisplay } from "./map-display";
import { LayerList } from "./LayerList";
import { TileSetList } from "./TileSetList";
import { useShallowMemo } from "../use-shallow-memo";

const styles = {
  map: {
    display: "block",
  } as React.CSSProperties,
};

export function getIndexInLayerFromTileCoord(
  world: MapWorld,
  layerId: number,
  c: Coordinates,
) {
  const layer = getLayer(world, layerId);
  return layer.width! * (c.y - layer.y) + (c.x - layer.x);
}

const serverOrigin = `${window.location.hostname}:8088`;
const wsServerURL = `ws://${serverOrigin}`;
const httpServerURL = `//${serverOrigin}`;
const tileSize = 32;

export const AppComponent: React.FC = () => {
  const [remoteLog, setRemoteLog] = useState<LogEntry[]>([]);
  const [localLog, setLocalLog] = useState<LogEntry[]>([]);
  const nextLocalId = useRef<number>(-1);

  const [serverState, setServerState] = useState(initialState);

  const [selectedTileSet, setSelectedTileSet] = useState(0);

  const [userId, setUserId] = useState("");

  function addToRemoteLog(entry: LogEntry) {
    setRemoteLog((old) =>
      R.sortBy(
        (e: LogEntry) => e.id,
        R.uniqBy((e) => e.id, [...old, entry]),
      ),
    );
  }

  const wsRef = useWebSocket([wsServerURL], (_msg) => {
    const msg = JSON.parse(_msg.data) as ServerMessage;
    switch (msg.type) {
      case MessageType.InitialServer: {
        setUserId(msg.userId);
        setServerState(msg.initialState);
        break;
      }
      case MessageType.LogEntryServer: {
        addToRemoteLog(msg.entry);
        break;
      }
      case MessageType.RemapEntryServer: {
        setLocalLog((old) => old.filter((e) => e.id !== msg.oldId));
        addToRemoteLog(msg.entry);
        break;
      }
      case MessageType.RejectEntryServer: {
        const entry = localLog.find((e) => e.id === msg.entryId);
        setLocalLog((old) => old.filter((e) => e.id !== msg.entryId));
        console.warn(
          "action rejected by server",
          entry && entry.action,
          msg.error,
        );
        break;
      }
      default:
        unreachable(msg);
    }
  });

  const runAction = (a: Action) => {
    if (!wsRef.current) {
      return;
    }
    const localEntry = { id: nextLocalId.current, action: a };
    nextLocalId.current--;

    const msg: ClientMessage = {
      type: MessageType.SubmitEntryClient,
      entry: localEntry,
    };
    wsRef.current.send(JSON.stringify(msg));
    setLocalLog((old) => [...old, localEntry]);
  };

  const state = [...remoteLog, ...localLog].reduce((a, c, i) => {
    try {
      return reducer(a, c.action);
    } catch (err) {
      console.warn("ignoring action (rejected by local reducer)", a, i);
      return a;
    }
  }, serverState);

  const imageStore = useImageStore(httpServerURL);
  useEffect(() => {
    for (const tileset of state.world.tilesets) {
      imageStore.getImage(tileset.image);
    }
  }, [state.world.tilesets, imageStore]);
  const assetCache = imageStore.asAssetCache();

  const {
    addSelectionToWorld,
    handleStartSelect,
    handleMoveSelect,
    handleEndSelect,
  } = useSelection(state.world.tilesets, imageStore);

  const worldForGlTiled = useMemo(
    () =>
      produce(state.world, (world) => {
        addSelectionToWorld(world, state.users, userId);
        for (const tileset of world.tilesets) {
          if (!assetCache[tileset.image]) {
            tileset.image = ""; // HACK don't load anything if the image is not in the cache
          }
        }
      }),
    [state.world, assetCache, state.users, userId, addSelectionToWorld],
  );

  const worldForGlTiledWithoutLayers = useShallowMemo(() => ({
    ...worldForGlTiled,
    layers: [],
  }));

  const tilemap = useMemo(() => {
    const tilemap = new glTiled.GLTilemap(
      (worldForGlTiledWithoutLayers as any) as glTiled.ITilemap, // TODO avoid cast
      { assetCache },
    );
    tilemap.repeatTiles = false;
    return tilemap;
  }, [worldForGlTiledWithoutLayers, assetCache]);

  return (
    <div>
      <div style={styles.map}>
        <MapDisplay
          tilemap={tilemap}
          width={1000}
          height={1000}
          offset={{ x: 30, y: 15 }}
          tileSize={tileSize}
          onPointerDown={(c, ev) => {
            handleStartSelect(c, userId, runAction);
          }}
          onPointerUp={(c, ev) => {
            handleEndSelect(userId, runAction);
          }}
          onPointerMove={(c, ev) => {
            handleMoveSelect(userId, state.users, c, runAction);
          }}
        />
      </div>
      <div className="overlay">
        <TileSetList
          tilesets={state.world.tilesets}
          setSelectedTileSet={setSelectedTileSet}
          selectedTileSet={selectedTileSet}
        ></TileSetList>

        <LayerList
          layers={state.world.layers}
          onToggleVisability={(id, v) => {
            runAction({
              type: ActionType.SetLayerVisibility,
              layerId: id,
              visibility: v,
            });
          }}
        ></LayerList>

        <div>
          <p style={{ width: 300, wordBreak: "break-all" }}>
            {JSON.stringify(state.users)}
          </p>
        </div>
      </div>
      UserId: {userId}
      <div>Remote log length: {remoteLog.length}</div>
      <div>Local log length: {localLog.length}</div>
    </div>
  );
};
