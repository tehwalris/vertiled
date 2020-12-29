import { MenuItem, Select } from "@material-ui/core";
import { ITileset } from "gl-tiled";
import React, { useMemo, useState } from "react";
import {
  createTilemapForTilesetPreview,
  Cursor,
  Rectangle,
} from "unilog-shared";
import { tileSize } from "../consts";
import { ImageStore } from "../image-store";
import { addSelectionToTilesets, useSelection } from "../useSelection";
import { TilemapDisplay } from "./TilemapDisplay";

interface Props {
  tilesets: ITileset[];
  setSelectedTileSet: (tileset: number) => void;
  selectedTileSetIndex: number;
  imageStore: ImageStore;
  onSelectTiles: (cursor: Cursor) => void;
}
export function TileSetList({
  tilesets,
  selectedTileSetIndex,
  setSelectedTileSet,
  imageStore,
}: Props) {
  const selectedTileSet = tilesets[selectedTileSetIndex] as
    | ITileset
    | undefined;

  const [tilesetsForGlTiled, selectionTilesetInfo] = useMemo(() => {
    const tilesetsForGlTiled = [];
    if (selectedTileSet) {
      tilesetsForGlTiled.push(selectedTileSet);
    }
    const selectionTilesetInfo = addSelectionToTilesets(
      tilesetsForGlTiled,
      imageStore,
    );
    return [tilesetsForGlTiled, selectionTilesetInfo];
  }, [selectedTileSet, imageStore]);

  const {
    addSelectionToLayers,
    handleStartSelect,
    handleMoveSelect,
    handleEndSelect,
  } = useSelection(selectionTilesetInfo);

  const [selection, setSelection] = useState<Rectangle>();

  const tilemap = useMemo(() => {
    if (!selectedTileSet) {
      return undefined;
    }
    const tilemap = createTilemapForTilesetPreview(
      selectedTileSet,
      tilesetsForGlTiled,
    );
    addSelectionToLayers(tilemap.layers, selection, []);
    return tilemap;
  }, [selectedTileSet, tilesetsForGlTiled, selectionTilesetInfo, selection]);

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <Select
        value={selectedTileSetIndex}
        onChange={(ev) => {
          setSelectedTileSet(ev.target.value as number);
        }}
      >
        {tilesets.map((tileset, i) => (
          <MenuItem key={i} value={i}>
            {tileset.name}
          </MenuItem>
        ))}
      </Select>

      {tilesets[selectedTileSetIndex] && (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginTop: 10,
          }}
        >
          {tilemap && (
            <div
              style={{
                border: "1px solid #888",
                width: "min-content",
              }}
            >
              <TilemapDisplay
                imageStore={imageStore}
                tilemap={tilemap}
                width={250}
                height={250}
                offset={{ x: 0, y: 0 }}
                tileSize={tileSize}
                onPointerDown={(c, ev) => {
                  if (ev.button === 0) {
                    ev.preventDefault();
                    handleStartSelect(c, setSelection);
                  }
                }}
                onPointerUp={(c, ev) => {
                  if (ev.button === 0) {
                    ev.preventDefault();
                    handleEndSelect(setSelection);
                  }
                }}
                onPointerMove={(c, ev) => {
                  handleMoveSelect(c, selection, setSelection);
                }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
