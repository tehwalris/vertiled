import * as R from "ramda";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Action,
  ClientMessage,
  LogEntry,
  MessageType,
  reducer,
  ServerMessage,
  unreachable,
  initialState,
  ActionType,
  MapWorld,
  getLayer,
  Coordinates,
} from "unilog-shared";
import { useWebSocket } from "../use-web-socket";
import { MapDisplay } from "./map-display";
import { v4 as genId } from "uuid";
import { useImageStore } from "../image-store";
import { generateTileMapFromTileset, TileMap } from "../tile-map";
import { makeGetDisplayTiles } from "../get-display-tiles";
import { produce } from "immer";
import * as glTiled from "gl-tiled";

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

const serverOrigin = "localhost:8080";
const wsServerURL = `ws://${serverOrigin}`;
const httpServerURL = `//${serverOrigin}`;
const tileSize = 32;

export const AppComponent: React.FC = () => {
  const [remoteLog, setRemoteLog] = useState<LogEntry[]>([]);
  const [localLog, setLocalLog] = useState<LogEntry[]>([]);
  const nextLocalId = useRef<number>(-1);

  const [serverState, setServerState] = useState(initialState);
  const [tileMap, setTileMap] = useState<TileMap>({});

  const [selectedTileSet, setSelectedTileSet] = useState(0);

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
        setTileMap(generateTileMapFromTileset(msg.initialState.world.tilesets));
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
  const ownCursorCoords: Coordinates | undefined = { x: 40, y: 30 };

  const imageStore = useImageStore(httpServerURL);
  useEffect(() => {
    for (const tileset of state.world.tilesets) {
      imageStore.getImage(tileset.image);
    }
  }, [state.world.tilesets]);
  const assetCache = imageStore.asAssetCache();

  const worldForGlTiled = useMemo(
    () =>
      produce(state.world, (world) => {
        for (const tileset of world.tilesets) {
          if (!assetCache[tileset.image]) {
            tileset.image = ""; // HACK don't load anything if the image is not in the cache
          }
        }
      }),
    [state.world, assetCache],
  );

  const tilemap = useMemo(() => {
    console.log("DEBUG new GLTilemap", state.world);
    const tilemap = new glTiled.GLTilemap(
      (worldForGlTiled as any) as glTiled.ITilemap, // TODO avoid cast
      { assetCache },
    );
    tilemap.resizeViewport(1000, 1000);
    return tilemap;
  }, [worldForGlTiled, assetCache]);

  return (
    <div>
      <div style={styles.map}>
        <MapDisplay
          tilemap={tilemap}
          pixelScale={2}
          offset={{ x: 30, y: 15 }}
          tileSize={tileSize}
          onMouseClick={(c) => {
            // TODO implement with cursors
            // const layerId = 11;
            // runAction({
            //   type: ActionType.SetTile,
            //   layerId,
            //   index: getIndexInLayerFromTileCoord(state.world, layerId, c),
            //   tileId: 10,
            // });
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
      </div>

      <div>Remote log length: {remoteLog.length}</div>
      <div>Local log length: {localLog.length}</div>
    </div>
  );
};
