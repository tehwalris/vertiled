import * as glTiled from "gl-tiled";
import { ITilelayer, ITilemap, ITileset } from "gl-tiled";
import { produce } from "immer";
import * as R from "ramda";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { unstable_batchedUpdates } from "react-dom";
import {
  Action,
  ActionType,
  ClientMessage,
  Coordinates,
  Cursor,
  extractCursor,
  getLayer,
  initialState,
  isLayerRegular,
  LogEntry,
  MessageType,
  reducer,
  ServerMessage,
  unreachable,
} from "unilog-shared";
import { createTilemapForTilesetPrview } from "unilog-shared";
import { useImageStore } from "../image-store";
import { useWebSocket } from "../use-web-socket";
import {
  addSelectionToTilesets,
  SelectionTilesetInfo,
  useSelection,
} from "../useSelection";
import { useWindowSize } from "../useWindowSize";
import { LayerList } from "./LayerList";
import { TilemapDisplay } from "./TilemapDisplay";
import { TileSetList } from "./TileSetList";

import {
  ThemeProvider,
  useMediaQuery,
  CssBaseline,
  createMuiTheme,
  Drawer,
} from "@material-ui/core";
import { tileSize } from "../consts";

export function getIndexInLayerFromTileCoord(
  world: ITilemap,
  layerId: number,
  c: Coordinates,
) {
  const layer = getLayer(world, layerId);
  if (!isLayerRegular(layer)) {
    throw new Error(`layer ${layerId} is not an ITilelayer`);
  }
  return layer.width! * (c.y - layer.y) + (c.x - layer.x);
}

const serverOrigin = `${window.location.hostname}:8088`;
const wsServerURL = `ws://${serverOrigin}`;
const httpServerURL = `//${serverOrigin}`;

export const AppComponent: React.FC = () => {
  const prefersDarkMode = useMediaQuery("(prefers-color-scheme: dark)");

  const theme = React.useMemo(
    () =>
      createMuiTheme({
        palette: {
          type: prefersDarkMode ? "dark" : "light",
        },
      }),
    [prefersDarkMode],
  );

  const [remoteLog, setRemoteLog] = useState<LogEntry[]>([]);
  const [localLog, setLocalLog] = useState<LogEntry[]>([]);
  const nextLocalId = useRef<number>(-1);

  const [serverState, setServerState] = useState(initialState);

  const [selectedTileSet, setSelectedTileSet] = useState<number>(0);

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
        unstable_batchedUpdates(() => {
          setLocalLog((old) => old.filter((e) => e.id !== msg.oldId));
          addToRemoteLog(msg.entry);
        });
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
      if (!tileset.image) {
        console.warn(`Tileset ${tileset.name} did not have an image property`);
        continue;
      }
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
          if (!tileset.image) {
            console.warn(
              `Tileset ${tileset.name} did not have an image property`,
            );
            continue;
          }
          if (!imageStore.assetCache[tileset.image]) {
            tileset.image = ""; // HACK don't load anything if the image is not in the cache
          }
        }

        let nextLayerId = Math.max(...world.layers.map((l) => l.id)) + 1;

        // TODO: possibly move out of here
        function addCursorToWorld(cursor: Cursor) {
          for (const { layerId, data } of cursor.contents) {
            const origLayer = getLayer(world, layerId);
            const cursorLayer: ITilelayer = {
              ...origLayer,
              type: "tilelayer",
              id: nextLayerId++,
              data,
              // XXX: as per https://doc.mapeditor.org/en/latest/reference/json-map-format/#layer, x and y are always 0 apparently
              x: 0,
              y: 0,
              width: cursor.frame.width,
              height: cursor.frame.height,
              offsetx: cursor.frame.x * tileSize + 20, // TODO: remove +20 once UI works
              offsety: cursor.frame.y * tileSize,
            };
            world.layers.push(cursorLayer);
          }
        }

        for (const user of state.users) {
          if (user.id !== userId && user.cursor) {
            addCursorToWorld(user.cursor);
          }
        }

        if (myState?.cursor) {
          addCursorToWorld(myState.cursor);
        }

        // TODO: render own selection above other people's cursors

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

  const windowSize = useWindowSize();

  const canvasWidth = windowSize.width - 300;
  const menuWidth = 300;

  const previewTileMap = useMemo(() => {
    const tilemap = new glTiled.GLTilemap(
      ({ ...worldForGlTiled } as any) as glTiled.ITilemap, // TODO avoid cast
      { assetCache: imageStore.assetCache },
    );
    tilemap.repeatTiles = false;
    return tilemap;
  }, [worldForGlTiled, imageStore.assetCache]);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />

      <div>
        <div
          style={{
            display: "flex",
            maxWidth: windowSize.width,
            overflow: "hidden",
          }}
        >
          <div className="overlayContainer">
            <TilemapDisplay
              imageStore={imageStore}
              tilemap={worldForGlTiled}
              width={canvasWidth}
              height={windowSize.height}
              offset={{ x: 0, y: 0 }}
              tileSize={tileSize}
              onPointerDown={(c, ev) => {
                // only start a selection if we don't have a cursor
                if (!myState?.cursor) {
                  handleStartSelect(c, userId, runAction);
                }
              }}
              onPointerUp={(c, ev) => {
                const cursor = myState?.cursor;
                if (cursor) {
                  console.log(
                    "TODO: actually place cursor (removing it for now)",
                  );

                  runAction({
                    type: ActionType.SetCursor,
                    userId: userId,
                    cursor: undefined,
                  });
                }

                // should be harmless to call if we don't have a selection
                handleEndSelect(userId, runAction);

                const selection = myState?.selection;
                if (
                  selection &&
                  selection.width >= 1 &&
                  selection.height >= 1
                ) {
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
            <div className="overlay"></div>
          </div>

          <Drawer
            variant="permanent"
            anchor="right"
            PaperProps={{
              style: {
                width: menuWidth,
                height: windowSize.height,
              },
            }}
            style={{}}
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
              imageStore={imageStore}
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
          </Drawer>
        </div>
      </div>
    </ThemeProvider>
  );
};
