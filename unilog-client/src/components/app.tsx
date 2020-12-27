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
  Tile,
  Tileset,
} from "unilog-shared";
import { Rectangle } from "../interfaces";
import { useWebSocket } from "../use-web-socket";
import { getDisplayTilesFunction, MapDisplay } from "./map-display";

const styles = {
  map: {
    display: "block",
  } as React.CSSProperties,
};

interface TileResource extends Tile {
  image: string;
  name: string;
  rectangle: Rectangle;
}

const serverOrigin = "localhost:8080";
const wsServerURL = `ws://${serverOrigin}`;
const httpServerURL = `//${serverOrigin}`;

export const AppComponent: React.FC = () => {
  const [remoteLog, setRemoteLog] = useState<LogEntry[]>([]);
  const [localLog, setLocalLog] = useState<LogEntry[]>([]);
  const nextLocalId = useRef<number>(-1);

  const [serverState, setServerState] = useState(initialState);
  const [tileMap, setTileMap] = useState<Record<number, TileResource>>({});

  function addToRemoteLog(entry: LogEntry) {
    setRemoteLog((old) =>
      R.sortBy(
        (e: LogEntry) => e.id,
        R.uniqBy((e) => e.id, [...old, entry]),
      ),
    );
  }

  function getTileResourcesFromTileset(tilesets: Tileset[]) {
    const tiles: Record<number, TileResource> = {};
    for (const tileset of tilesets) {
      for (let index = 0; index < tileset.tilecount; index++) {
        tiles[tileset.firstgid + index] = {
          id: tileset.firstgid + index,
          properties: tileset.tiles?.[index]?.properties ?? [],
          image: tileset.image,
          name: tileset.name,
          rectangle: {
            x: tileset.tilewidth * (index % tileset.columns),
            y: tileset.tileheight * Math.floor(index / tileset.columns),
            width: tileset.tilewidth,
            height: tileset.tileheight,
          },
        };
      }
    }
    return tiles;
  }

  const wsRef = useWebSocket([wsServerURL], (_msg) => {
    const msg = JSON.parse(_msg.data) as ServerMessage;
    switch (msg.type) {
      case MessageType.InitialServer: {
        setTileMap(
          getTileResourcesFromTileset(msg.initialState.world.tilesets),
        );
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
    setLocalLog((old) => [...old, localEntry]);
    nextLocalId.current--;
    const msg: ClientMessage = {
      type: MessageType.SubmitEntryClient,
      entry: localEntry,
    };
    wsRef.current.send(JSON.stringify(msg));
  };

  const state = [...remoteLog, ...localLog].reduce((a, c, i) => {
    try {
      return reducer(a, c.action);
    } catch (err) {
      console.warn("ignoring action (rejected by local reducer)", a, i);
      return a;
    }
  }, serverState);

  const imageResources = useRef<Map<string, HTMLImageElement>>(new Map());

  const [renderTrigger, setRenderTrigger] = useState({});

  function loadImage(url: string) {
    const imgEl = document.createElement("img");
    imgEl.src = `${httpServerURL}/${url}`;
    imageResources.current.set(url, imgEl);
    imgEl.onload = () => {
      setRenderTrigger({});
    };
  }

  const getDisplayTiles: getDisplayTilesFunction = ({ x, y }) => {
    const layers = state.world.layers.filter(
      (l) =>
        l.width &&
        l.height &&
        l.x + l.width > x &&
        l.x <= x &&
        l.y + l.height > y &&
        l.y <= y,
    );
    const tiles = layers
      .sort((a, b) => a.id - b.id)
      .map((l) => l.data![y * l.width! + x]);

    const tileResources = tiles
      .map((tileId) => {
        if (tileId === 0) {
          // Background tile
          return undefined;
        }
        if (!tileMap[tileId]) {
          console.error(`Could not find tile with ID ${tileId}`, tileMap);
          return undefined;
        }
        const tile = tileMap[tileId];
        if (!imageResources.current.has(tile.image)) {
          loadImage(tile.image);
          // TODO: Loading status here
          return undefined;
        }

        return {
          ...tileMap[tileId],
          image: imageResources.current.get(tile.image)!,
        };
      })
      .filter((tile) => tile && tile.image.complete)
      .map((tile) => tile!);

    return tileResources;
  };

  return (
    <div>
      <div style={styles.map}>
        <MapDisplay
          getDisplayTiles={getDisplayTiles}
          width={1000}
          height={1000}
          pixelScale={2}
          focus={{ x: 12, y: 10 }}
          tileSize={32}
        />
      </div>
      <div>Remote log length: {remoteLog.length}</div>
      <div>Local log length: {localLog.length}</div>
    </div>
  );
};
