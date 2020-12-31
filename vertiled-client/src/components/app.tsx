import {
  AppBar,
  Button,
  createMuiTheme,
  CssBaseline,
  Divider,
  Drawer,
  IconButton,
  makeStyles,
  ThemeProvider,
  Toolbar,
  Box,
  ButtonGroup,
  ListSubheader,
  Typography,
  Tooltip,
  useMediaQuery,
} from "@material-ui/core";

import { ToggleButtonGroup, ToggleButton } from "@material-ui/lab";
import clsx from "clsx";
import { produce } from "immer";
import downloadFile from "js-file-download";
import * as R from "ramda";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useRef,
} from "react";
import { FiMenu } from "react-icons/fi";
import {
  ActionType,
  addCursorOnNewLayers,
  Coordinates,
  Cursor,
  extractCursor,
  Rectangle,
  tileSize,
  mirrorCursor,
  MirrorDirection,
} from "vertiled-shared";
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
import {
  BiEraser,
  BiUndo,
  BiEditAlt,
  BiRightArrowCircle,
  BiDownArrowCircle,
} from "react-icons/bi";
import { CursorContent } from "vertiled-shared/src";

const serverOrigin =
  process.env.NODE_ENV === "development"
    ? `${window.location.hostname}:8088`
    : window.location.host;
const wsServerURL = `${
  window.location.protocol === "https:" ? "wss" : "ws"
}://${serverOrigin}`;
const imageStoreURL = `//${serverOrigin}/world`;

const drawerWidth = 300;

const MAIN_CANVAS_ID = "mainCanvas";

const useStyles = makeStyles((theme) => ({
  root: {
    display: "flex",
  },
  appBar: {
    transition: theme.transitions.create(["margin", "width"], {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.leavingScreen,
    }),
  },
  appBarShift: {
    width: `calc(100% - ${drawerWidth}px)`,
    transition: theme.transitions.create(["margin", "width"], {
      easing: theme.transitions.easing.easeOut,
      duration: theme.transitions.duration.enteringScreen,
    }),
    marginRight: drawerWidth,
  },
  drawer: {
    width: drawerWidth,
    flexShrink: 0,
    overflowX: "hidden",
  },
  drawerPaper: {
    width: drawerWidth,
    overflowX: "hidden",
  },

  button: {
    padding: 11,
  },
  content: {
    flexGrow: 1,
    backgroundColor: theme.palette.background.default,
    padding: theme.spacing(3),
  },

  mainDisplayContainer: {
    display: "flex",
    maxWidth: "100vw",
    overflow: "hidden",
  },
  toolbar: theme.mixins.toolbar,
}));
enum EditingMode {
  Clone = "Clone",
  Erase = "Erase",
}

export const AppComponent: React.FC = () => {
  const prefersDarkMode = useMediaQuery("(prefers-color-scheme: dark)");

  const classes = useStyles();

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

  const [isDrawerOpen, setDrawerOpen] = useState(true);

  const {
    state,
    userId,
    runAction,
    startUndoGroup,
    endUndoGroup,
    tryUndo,
  } = useUnilog(wsServerURL);
  const myState = state.users.find((u) => u.id === userId);

  const [editingMode, setEditingMode] = useState(EditingMode.Clone);

  const [selectedTileSet, setSelectedTileSet] = useState<number>(0);

  const imageStore = useImageStore(imageStoreURL);
  useEffect(() => {
    for (const tileset of state.world.tilesets) {
      if (!tileset.image) {
        console.warn(`Tileset ${tileset.name} did not have an image property`);
        continue;
      }
      imageStore.getImage(tileset.image);
    }
  }, [state.world.tilesets, imageStore]);
  const imageStoreAssetCache = imageStore.assetCache;

  const [tilesetsForGlTiled, selectionTilesetInfo] = useMemo(() => {
    let selectionTilesetInfo: SelectionTilesetInfo;
    const tilesets = produce(state.world.tilesets, (tilesets) => {
      selectionTilesetInfo = addSelectionToTilesets(tilesets, imageStore);
      for (const tileset of tilesets) {
        if (tileset.image && !imageStoreAssetCache[tileset.image]) {
          tileset.image = "";
        }
      }
    });
    return [tilesets, selectionTilesetInfo!];
  }, [state.world.tilesets, imageStore, imageStoreAssetCache]);

  const {
    makeSelectionLayer,
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

  const selectionLayer = makeSelectionLayer(
    state.world.layers,
    myState?.selection,
    state.users
      .map((u) => u.selection)
      .filter((v) => v)
      .map((v) => v!),
  );

  let worldForGlTiled = {
    ...state.world,
    layers: [...state.world.layers],
    tilesets: tilesetsForGlTiled,
  };
  if (selectionLayer) {
    worldForGlTiled.layers.push(selectionLayer);
  }
  if (defaultLayerId) {
    const addCursor = (cursor: Cursor, highlightGid: number) => {
      worldForGlTiled.layers = addCursorOnNewLayers(
        worldForGlTiled.layers,
        cursor,
        defaultLayerId,
        highlightGid,
      );
    };
    for (const user of state.users) {
      if (user.id !== userId && user.cursor) {
        addCursor(user.cursor, selectionTilesetInfo.othersSelectionTileId);
      }
    }
    if (myState?.cursor) {
      addCursor(myState.cursor, selectionTilesetInfo.mySelectionTileId);
    }
  }
  worldForGlTiled.layers = worldForGlTiled.layers.filter(
    (layer) => layer.visible,
  );

  const windowSize = useWindowSize();

  const setSelection = (selection: Rectangle | undefined) => {
    runAction((userId) => ({
      type: ActionType.SetSelection,
      userId,
      selection,
    }));
  };

  const setLayerVisibility = useCallback(
    (layerId: number, visibility: boolean) => {
      runAction(() => ({
        type: ActionType.SetLayerVisibility,
        layerId,
        visibility,
      }));
    },
    [runAction],
  );

  const setCursor = useCallback(
    (cursor: Cursor) => {
      runAction((userId) => ({
        type: ActionType.SetCursor,
        userId,
        cursor,
      }));
    },
    [runAction],
  );
  const onTileSetListSetCursor = useCallback(
    (cursor) => {
      setEditingMode(EditingMode.Clone);
      setCursor(cursor);
    },
    [setCursor],
  );

  const pointerDownRef = useRef<{ button: number }>();

  useEffect(() => {
    if (!userId) return;
    const user = state.users.find((u) => u.id === userId);
    const cursor = user?.cursor;
    if (!cursor) return;

    if (
      cursor.contents.length === 1 &&
      selectedLayerIds.length === 1 &&
      cursor.contents[0].layerId !== selectedLayerIds[0]
    ) {
      // If there is only one layer in cursor and one layer selected, we paste it onto that selected layer
      const modifiedContent: CursorContent = {
        ...cursor.contents[0],
        layerId: selectedLayerIds[0],
      };
      runAction((userId) => ({
        type: ActionType.SetCursor,
        cursor: { ...cursor, contents: [modifiedContent] },
        userId,
      }));
    }
  }, [runAction, selectedLayerIds, state.users, userId]);

  const panStartRef = useRef<{
    down: Coordinates;
    originalOffset: Coordinates;
  }>();
  const [panOffset, setPanOffset] = useState<Coordinates>({ x: 0, y: 0 });

  const wheelHandlerRef = useRef<Coordinates>();

  useEffect(() => {
    const wheelHandler = (e: WheelEvent) => {
      if (!e.target || (e.target as any)?.id !== MAIN_CANVAS_ID) {
        return;
      }
      e.stopPropagation();
      if (wheelHandlerRef.current) {
        wheelHandlerRef.current = {
          x: wheelHandlerRef.current.x + e.deltaX,
          y: wheelHandlerRef.current.y + e.deltaY,
        };
      } else {
        wheelHandlerRef.current = {
          x: e.deltaX,
          y: e.deltaY,
        };
        requestAnimationFrame(() => {
          setPanOffset((old) => {
            if (!wheelHandlerRef.current) {
              throw new Error("wheelHandlerRef is not defined");
            }
            return {
              x: old.x + (wheelHandlerRef.current.x * 2) / tileSize,
              y: old.y + (wheelHandlerRef.current.y * 2) / tileSize,
            };
          });
          wheelHandlerRef.current = undefined;
        });
      }
    };
    window.addEventListener("wheel", wheelHandler, { passive: true });
    return () => {
      window.removeEventListener("wheel", wheelHandler);
    };
  });

  return (
    <ThemeProvider theme={theme}>
      <div className={classes.root}>
        <CssBaseline />
        <AppBar
          position="fixed"
          className={clsx(classes.appBar, {
            [classes.appBarShift]: isDrawerOpen,
          })}
        >
          <Toolbar variant="regular">
            <Typography variant="h6" className="">
              Vertiled
            </Typography>
            <Divider style={{ marginLeft: "auto" }}></Divider>
            <Box mr={1}>
              <Tooltip title="Undo" aria-label="Undo">
                <IconButton color="inherit" aria-label="menu" onClick={tryUndo}>
                  <BiUndo />
                </IconButton>
              </Tooltip>
            </Box>

            <Box mr={1}>
              <ButtonGroup>
                <Tooltip
                  title="Mirror Horizontally"
                  aria-label="Mirror Horizontally"
                >
                  <Button
                    className={classes.button}
                    onClick={() => {
                      if (!userId) return;
                      const user = state.users.find((u) => u.id === userId);
                      const cursor = user?.cursor;
                      if (!cursor) return;
                      runAction((userId) => {
                        const newC = mirrorCursor(
                          cursor,
                          MirrorDirection.Horizontal,
                        );
                        console.log("newC", newC);
                        return {
                          type: ActionType.SetCursor,
                          userId,
                          cursor: newC,
                        };
                      });
                    }}
                  >
                    <BiRightArrowCircle />
                  </Button>
                </Tooltip>

                <Tooltip
                  title="Mirror Vertically"
                  aria-label="Mirror Vertically"
                >
                  <Button
                    className={classes.button}
                    onClick={() => {
                      if (!userId) return;
                      const user = state.users.find((u) => u.id === userId);
                      const cursor = user?.cursor;
                      if (!cursor) return;
                      runAction((userId) => {
                        return {
                          type: ActionType.SetCursor,
                          userId,
                          cursor: mirrorCursor(
                            cursor,
                            MirrorDirection.Vertical,
                          ),
                        };
                      });
                    }}
                  >
                    <BiDownArrowCircle />
                  </Button>
                </Tooltip>
              </ButtonGroup>
            </Box>

            <ToggleButtonGroup
              value={editingMode}
              exclusive
              onChange={(ev: any, newMode: EditingMode) => {
                if (!newMode) return;
                setEditingMode(newMode);
              }}
              aria-label="text alignment"
            >
              <Tooltip title="Clone" aria-label="Clone">
                <ToggleButton value="Clone">
                  <BiEditAlt />
                </ToggleButton>
              </Tooltip>

              <Tooltip title="Erease" aria-label="Erease">
                <ToggleButton value="Erase">
                  <BiEraser />
                </ToggleButton>
              </Tooltip>
            </ToggleButtonGroup>

            <IconButton
              color="inherit"
              aria-label="menu"
              onClick={() => setDrawerOpen(!isDrawerOpen)}
            >
              <FiMenu />
            </IconButton>
          </Toolbar>
        </AppBar>
        <div>
          <div className={classes.mainDisplayContainer}>
            <div className="overlayContainer">
              <TilemapDisplay
                id={MAIN_CANVAS_ID}
                imageStore={imageStore}
                tilemap={worldForGlTiled}
                width={windowSize.width}
                height={windowSize.height}
                offset={panOffset}
                tileSize={tileSize}
                onWheel={(e) => {}}
                onPointerDown={(c, ev, nonOffsetCoordinates) => {
                  if (pointerDownRef.current) {
                    return;
                  }

                  if (ev.button === 1) {
                    ev.preventDefault();

                    panStartRef.current = {
                      down: nonOffsetCoordinates,
                      originalOffset: panOffset,
                    };
                  } else if (
                    ev.button === 0 &&
                    editingMode === EditingMode.Clone
                  ) {
                    ev.preventDefault();

                    startUndoGroup();
                    const cursor = myState?.cursor;
                    const defaultLayerId = R.last(selectedLayerIds);
                    if (cursor && defaultLayerId !== undefined) {
                      runAction((userId) => ({
                        type: ActionType.PasteFromCursor,
                        userId,
                        defaultLayerId,
                      }));
                    }
                  } else if (ev.button === 0 && EditingMode.Erase) {
                    ev.preventDefault();

                    startUndoGroup();
                    runAction(() => ({
                      type: ActionType.FillRectangle,
                      layerIds: selectedLayerIds,
                      rectangle: { x: c.x, y: c.y, width: 1, height: 1 },
                      tileId: 0,
                    }));
                  } else if (
                    ev.button === 2 &&
                    editingMode === EditingMode.Clone
                  ) {
                    ev.preventDefault();

                    handleStartSelect(c, setSelection);
                  } else if (
                    ev.button === 2 &&
                    editingMode === EditingMode.Erase
                  ) {
                    ev.preventDefault();

                    handleStartSelect(c, setSelection);
                  }

                  pointerDownRef.current = { button: ev.button };
                }}
                onPointerUp={(c, ev) => {
                  if (!pointerDownRef.current) {
                    return;
                  }

                  if (
                    editingMode === EditingMode.Clone &&
                    pointerDownRef.current.button === 0
                  ) {
                    ev.preventDefault();

                    endUndoGroup();
                  } else if (
                    editingMode === EditingMode.Clone &&
                    pointerDownRef.current.button === 2
                  ) {
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
                      setCursor(cursor);
                    }
                  } else if (
                    editingMode === EditingMode.Erase &&
                    pointerDownRef.current.button === 0
                  ) {
                    ev.preventDefault();

                    endUndoGroup();
                  } else if (
                    editingMode === EditingMode.Erase &&
                    pointerDownRef.current.button === 2
                  ) {
                    ev.preventDefault();

                    const rectangleToErase = myState?.selection;
                    if (rectangleToErase) {
                      startUndoGroup();
                      runAction(() => ({
                        type: ActionType.FillRectangle,
                        layerIds: selectedLayerIds,
                        rectangle: rectangleToErase,
                        tileId: 0,
                      }));
                      endUndoGroup();
                    }
                    handleEndSelect(setSelection);
                  }

                  pointerDownRef.current = undefined;
                  panStartRef.current = undefined;
                }}
                onPointerMove={(c, ev, nonOffsetCoordinates) => {
                  if (panStartRef.current) {
                    setPanOffset({
                      x:
                        panStartRef.current.originalOffset.x +
                        panStartRef.current.down.x -
                        nonOffsetCoordinates.x,
                      y:
                        panStartRef.current.originalOffset.y +
                        panStartRef.current.down.y -
                        nonOffsetCoordinates.y,
                    });
                  } else if (editingMode === EditingMode.Clone) {
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
                        if (pointerDownRef.current) {
                          const defaultLayerId = R.last(selectedLayerIds);
                          if (defaultLayerId !== undefined) {
                            runAction((userId) => ({
                              type: ActionType.PasteFromCursor,
                              userId,
                              defaultLayerId,
                            }));
                          }
                        }
                      }
                    }
                  } else if (editingMode === EditingMode.Erase) {
                    if (pointerDownRef.current?.button === 0) {
                      runAction(() => ({
                        type: ActionType.FillRectangle,
                        layerIds: selectedLayerIds,
                        rectangle: { x: c.x, y: c.y, width: 1, height: 1 },
                        tileId: 0,
                      }));
                    } else if (pointerDownRef.current?.button === 2) {
                      handleMoveSelect(c, myState?.selection, setSelection);
                    }
                  }
                }}
              />
            </div>

            <Drawer
              id="test"
              anchor="right"
              className={classes.drawer}
              open={isDrawerOpen}
              variant="persistent"
              classes={{
                paper: classes.drawerPaper,
              }}
            >
              {/*<div className={classes.toolbar} /> */}

              <LayerList
                selectedLayerIds={selectedLayerIds}
                setSelectedLayerIds={setSelectedLayerIds}
                layers={state.world.layers}
                onToggleVisibility={setLayerVisibility}
              />
              <Divider></Divider>
              <TileSetList
                tilesets={state.world.tilesets}
                imageStore={imageStore}
                setSelectedTileSet={setSelectedTileSet}
                selectedTileSetIndex={selectedTileSet}
                onSelectTiles={onTileSetListSetCursor}
              />
              <ListSubheader disableSticky>Debug</ListSubheader>
              <Box px={2}>
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
              </Box>
            </Drawer>
          </div>
        </div>
      </div>
    </ThemeProvider>
  );
};
