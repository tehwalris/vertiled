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

  // TODO get from synced state

  const uiFirstGid = state.world.tilesets.reduce(
    (a, b) => Math.max(a, b.firstgid + b.tilecount),
    1,
  );

  const mySelectionTileId = uiFirstGid;
  const othersSelectionTileId = uiFirstGid + 1;

  const {
    addSelectionLayer: addCursorLayer,
    handleStartSelect,
    handleMoveSelect,
    handleEndSelect,
  } = useSelection();

  const imageStore = useImageStore(httpServerURL);
  useEffect(() => {
    for (const tileset of state.world.tilesets) {
      imageStore.getImage(tileset.image);
    }
    imageStore.getImage("ui-tiles.png");
  }, [state.world.tilesets, imageStore]);
  const assetCache = imageStore.asAssetCache();

  const worldForGlTiled = useMemo(
    () =>
      produce(state.world, (world) => {
        addCursorLayer(
          world.layers,
          state.users,
          userId,
          mySelectionTileId,
          othersSelectionTileId,
        );
        world.tilesets.push({
          columns: 9,
          firstgid: uiFirstGid,
          image: "ui-tiles.png",
          imageheight: 32,
          imagewidth: 288,
          margin: 0,
          name: "ui-tiles",
          spacing: 0,
          tilecount: 9,
          tileheight: 32,
          tilewidth: 32,
        });
        for (const tileset of world.tilesets) {
          if (!assetCache[tileset.image]) {
            tileset.image = ""; // HACK don't load anything if the image is not in the cache
          }
        }
      }),
    [
      state.world,
      assetCache,
      uiFirstGid,
      state.users,
      mySelectionTileId,
      othersSelectionTileId,
      userId,
      addCursorLayer,
    ],
  );

  const tilemap = useMemo(() => {
    const tilemap = new glTiled.GLTilemap(
      (worldForGlTiled as any) as glTiled.ITilemap, // TODO avoid cast
      { assetCache },
    );
    tilemap.repeatTiles = false;
    return tilemap;
  }, [worldForGlTiled, assetCache]);

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
        <div className="selection-list">
          <h3>Tilesets</h3>
          <ul>
            {state.world.tilesets.map((tileset, i) => (
              <li
                key={i}
                onClick={() => setSelectedTileSet(i)}
                className={selectedTileSet === i ? "active" : ""}
              >
                {tileset.name}
              </li>
            ))}
          </ul>
        </div>
        <div className="selection-list">
          <h3>Layers</h3>
          <ul>
            {state.world.layers.map((layer, i) => (
              <li
                key={layer.id}
                onClick={() => {
                  runAction({
                    type: ActionType.SetLayerVisibility,
                    layerId: layer.id,
                    visibility: !layer.visible,
                  });
                }}
                className={layer.visible ? "active" : ""}
              >
                {layer.name}
              </li>
            ))}
          </ul>
        </div>
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
