import {
  Button,
  createMuiTheme,
  CssBaseline,
  Drawer,
  ThemeProvider,
  useMediaQuery,
} from "@material-ui/core";
import { ITilemap } from "gl-tiled";
import { current as immerCurrent, produce } from "immer";
import downloadFile from "js-file-download";
import * as R from "ramda";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActionType,
  addCursorOnNewLayers,
  Coordinates,
  extractCursor,
  getLayer,
  isLayerRegular,
  Rectangle,
  tileSize,
} from "unilog-shared";
import { primaryColor, secondaryColor } from "../consts";
import { useImageStore } from "../image-store";
import {
  addSelectionToTilesets,
  SelectionTilesetInfo,
  useSelection,
} from "../useSelection";
import { useUnilog } from "../useUnilog";
import { useWindowSize } from "../useWindowSize";
import { LayerList } from "./LayerList";
import { TilemapDisplay } from "./TilemapDisplay";
import { TileSetList } from "./TileSetList";

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
          primary: {
            main: primaryColor,
          },
          secondary: {
            main: secondaryColor,
          },
        },
      }),
    [prefersDarkMode],
  );

  const [state, userId, runAction] = useUnilog(wsServerURL);
  const myState = state.users.find((u) => u.id === userId);

  const [selectedTileSet, setSelectedTileSet] = useState<number>(0);

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

  const [selectedLayerIds, setSelectedLayerIds] = useState<number[]>([]);
  useEffect(() => {
    if (!selectedLayerIds.length && state.world.layers.length) {
      setSelectedLayerIds((selectedLayerIds) => {
        if (!selectedLayerIds.length && state.world.layers.length) {
          return [R.last(state.world.layers)!.id];
        } else {
          return selectedLayerIds;
        }
      });
    }
  }, [selectedLayerIds, state.world.layers]);
  const defaultLayerId = R.last(selectedLayerIds);

  const worldForGlTiled = produce(state.world, (world) => {
    addSelectionToLayers(
      world.layers,
      myState?.selection,
      state.users
        .map((u) => u.selection)
        .filter((v) => v)
        .map((v) => v!),
    );
    for (const tileset of world.tilesets) {
      if (!tileset.image) {
        console.warn(`Tileset ${tileset.name} did not have an image property`);
        continue;
      }
      if (!imageStore.assetCache[tileset.image]) {
        tileset.image = ""; // HACK don't load anything if the image is not in the cache
      }
    }

    world.layers = immerCurrent(world.layers);

    if (defaultLayerId) {
      for (const user of state.users) {
        if (user.id !== userId && user.cursor) {
          world.layers = addCursorOnNewLayers(
            world.layers,
            user.cursor,
            defaultLayerId,
          );
        }
      }

      if (myState?.cursor) {
        world.layers = addCursorOnNewLayers(
          world.layers,
          myState.cursor,
          defaultLayerId,
        );
      }
    }

    // TODO: render own selection above other people's cursors

    world.layers = world.layers.filter((layer) => layer.visible);
    world.tilesets = tilesetsForGlTiled;
  });

  const windowSize = useWindowSize();

  const canvasWidth = windowSize.width - 300;
  const menuWidth = 300;

  const setSelection = (selection: Rectangle | undefined) => {
    runAction((userId) => ({
      type: ActionType.SetSelection,
      userId,
      selection,
    }));
  };

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
                if (ev.button === 0) {
                  ev.preventDefault();

                  const cursor = myState?.cursor;
                  const defaultLayerId = R.last(selectedLayerIds);
                  if (cursor && defaultLayerId !== undefined) {
                    runAction((userId) => ({
                      type: ActionType.PasteFromCursor,
                      userId,
                      defaultLayerId,
                    }));
                  }
                } else if (ev.button === 2) {
                  ev.preventDefault();

                  handleStartSelect(c, setSelection);
                }
              }}
              onPointerUp={(c, ev) => {
                if (ev.button === 2) {
                  ev.preventDefault();

                  handleEndSelect(setSelection);

                  const selection = myState?.selection;
                  if (
                    selection &&
                    selection.width >= 1 &&
                    selection.height >= 1
                  ) {
                    const cursor = extractCursor(state.world, selection);
                    cursor.contents = cursor.contents.filter(
                      (c) =>
                        c.layerId === undefined ||
                        selectedLayerIds.includes(c.layerId),
                    );
                    runAction((userId) => ({
                      type: ActionType.SetCursor,
                      userId,
                      cursor,
                    }));
                  }
                }
              }}
              onPointerMove={(c, ev) => {
                handleMoveSelect(c, myState?.selection, setSelection);

                const oldCursor = myState?.cursor;
                if (oldCursor) {
                  const newFrameStart: Coordinates = {
                    x: c.x - (oldCursor.initialFrame.width - 1),
                    y: c.y - (oldCursor.initialFrame.height - 1),
                  };
                  if (
                    newFrameStart.x !== oldCursor.frame.x ||
                    newFrameStart.y !== oldCursor.frame.y
                  ) {
                    runAction((userId) => ({
                      type: ActionType.SetCursorOffset,
                      userId,
                      offset: newFrameStart,
                    }));
                  }
                }
              }}
            />
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
          >
            <LayerList
              selectedLayerIds={selectedLayerIds}
              setSelectedLayerIds={setSelectedLayerIds}
              layers={state.world.layers}
              onToggleVisibility={(id, v) => {
                runAction(() => ({
                  type: ActionType.SetLayerVisibility,
                  layerId: id,
                  visibility: v,
                }));
              }}
            />
            <TileSetList
              tilesets={state.world.tilesets}
              imageStore={imageStore}
              setSelectedTileSet={setSelectedTileSet}
              selectedTileSetIndex={selectedTileSet}
              onSelectTiles={(cursor) => {
                runAction((userId) => ({
                  type: ActionType.SetCursor,
                  userId,
                  cursor,
                }));
              }}
            />
            <div className="selection-list">
              <div>Connected users: {state.users.length}</div>
              <div>UserId: {userId}</div>
              <Button
                onClick={() => {
                  downloadFile(
                    JSON.stringify(state.world, null, 2),
                    "main.json",
                  );
                }}
              >
                Download as JSON
              </Button>
            </div>
          </Drawer>
        </div>
      </div>
    </ThemeProvider>
  );
};
