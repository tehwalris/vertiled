import * as glTiled from "gl-tiled";
import { produce } from "immer";
import * as R from "ramda";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Action,
  ActionType,
  ClientMessage,
  Coordinates,
  extractCursor,
  getLayer,
  initialState,
  Layer,
  LogEntry,
  MapWorld,
  MessageType,
  reducer,
  ServerMessage,
  unreachable,
} from "unilog-shared";
import { useImageStore } from "../image-store";
import { useWebSocket } from "../use-web-socket";
import {
  addSelectionToTilesets,
  SelectionTilesetInfo,
  useSelection,
} from "../useSelection";
import { MapDisplay } from "./map-display";
import { LayerList } from "./LayerList";
import { TileSetList } from "./TileSetList";
import { useWindowSize } from "../useWindowSize";
import { useShallowMemo } from "../use-shallow-memo";

const EMPTY_LAYERS: Layer[] = [];

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

  const state = useMemo(
    () =>
      [...remoteLog, ...localLog].reduce((a, c, i) => {
        try {
          return reducer(a, c.action);
        } catch (err) {
          console.warn("ignoring action (rejected by local reducer)", a, i);
          return a;
        }
      }, serverState),
    [serverState, remoteLog, localLog],
  );

  const imageStore = useImageStore(httpServerURL);
  useEffect(() => {
    for (const tileset of state.world.tilesets) {
      imageStore.getImage(tileset.image);
    }
  }, [state.world.tilesets, imageStore]);

  const [tilesetsForGlTiled, selectionTilesetInfo] = useMemo(() => {
    let selectionTilesetInfo: SelectionTilesetInfo;
    const tilesets = produce(state.world.tilesets, (tilesets) => {
      selectionTilesetInfo = addSelectionToTilesets(tilesets, imageStore);
    });
    return [tilesets, selectionTilesetInfo!];
  }, [state.world.tilesets, imageStore]);

  const {
    addSelectionToLayers,
    handleStartSelect,
    handleMoveSelect,
    handleEndSelect,
  } = useSelection(selectionTilesetInfo);

  const myState = state.users.find((u) => u.id === userId);

  const worldForGlTiled = useMemo(
    () =>
      produce(state.world, (world) => {
        addSelectionToLayers(world.layers, state.users, userId);
        for (const tileset of world.tilesets) {
          if (!imageStore.assetCache[tileset.image]) {
            tileset.image = ""; // HACK don't load anything if the image is not in the cache
          }
        }
        world.layers = world.layers.filter((layer) => layer.visible);
        world.tilesets = tilesetsForGlTiled;
      }),
    [
      state.world,
      tilesetsForGlTiled,
      imageStore.assetCache,
      state.users,
      userId,
      addSelectionToLayers,
    ],
  );

  const worldForGlTiledWithoutLayers = useShallowMemo(() => ({
    ...worldForGlTiled,
    layers: EMPTY_LAYERS,
  }));

  const tilemap = useMemo(() => {
    console.log("DEBUG new tilemap");
    const tilemap = new glTiled.GLTilemap(
      ({ ...worldForGlTiledWithoutLayers } as any) as glTiled.ITilemap, // TODO avoid cast
      { assetCache: imageStore.assetCache },
    );
    return tilemap;
  }, [worldForGlTiledWithoutLayers, imageStore.assetCache]);

  useEffect(() => {
    for (const layer of tilemap.desc.layers) {
      tilemap.destroyLayerFromDesc(layer);
    }
    const newLayers = (worldForGlTiled.layers as any) as glTiled.ILayer[]; // TODO avoid cast
    for (const layer of newLayers) {
      tilemap.createLayerFromDesc(layer);
    }
    tilemap.desc.layers = [...newLayers];

    // IMPORTANT This is a setter that affects all currently added layers. If repeatTiles is true (default), all layers render incorrectly.
    tilemap.repeatTiles = false;
  }, [tilemap, worldForGlTiled.layers]);

  const windowSize = useWindowSize();

  const canvasWidth = windowSize.width - 300;
  const menuWidth = 300;

  return (
    <div>
      <div
        style={{
          display: "flex",
          width: windowSize.width,
        }}
      >
        <MapDisplay
          tilemap={tilemap}
          width={canvasWidth}
          height={windowSize.height}
          offset={{ x: 0, y: 0 }}
          tileSize={tileSize}
          onPointerDown={(c, ev) => {
            handleStartSelect(c, userId, runAction);
          }}
          onPointerUp={(c, ev) => {
            handleEndSelect(userId, runAction);

            const selection = myState?.selection;
            if (selection && selection.width >= 1 && selection.height >= 1) {
              const cursor = extractCursor(state.world, selection);
              runAction({
                type: ActionType.SetCursor,
                userId: userId,
                cursor: cursor,
              });
            }
          }}
          onPointerMove={(c, ev) => {
            handleMoveSelect(userId, state.users, c, runAction);
          }}
        />
        <div
          style={{
            width: menuWidth,
            height: windowSize.height,
            overflow: "scroll",
            backgroundColor: "black",
            color: "white",
          }}
        >
          <LayerList
            layers={state.world.layers}
            onToggleVisibility={(id, v) => {
              runAction({
                type: ActionType.SetLayerVisibility,
                layerId: id,
                visibility: v,
              });
            }}
          ></LayerList>

          <TileSetList
            tilesets={state.world.tilesets}
            setSelectedTileSet={setSelectedTileSet}
            selectedTileSet={selectedTileSet}
          ></TileSetList>

          <div className="selection-list">
            <h3>Debug</h3>
            <p style={{ width: 300, wordBreak: "break-all" }}>
              {JSON.stringify(state.users)}
            </p>
            UserId: {userId}
            <div>Remote log length: {remoteLog.length}</div>
            <div>Local log length: {localLog.length}</div>
          </div>
        </div>
      </div>
    </div>
  );
};
