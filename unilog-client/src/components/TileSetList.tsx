import { ITileset } from "gl-tiled";
import React, { useState } from "react";
import { Select, MenuItem } from "@material-ui/core";
import { TilemapDisplay } from "./TilemapDisplay";
import { ImageStore } from "../image-store";
import { tileSize } from "../consts";
import { createTilemapForTilesetPreview } from "unilog-shared";

interface Props {
  tilesets: ITileset[];
  setSelectedTileSet: (tileset: number) => void;
  selectedTileSet: number;
  imageStore: ImageStore;
}
export function TileSetList({
  tilesets,
  selectedTileSet,
  setSelectedTileSet,
  imageStore,
}: Props) {
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      <Select
        value={selectedTileSet}
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

      {tilesets[selectedTileSet] && (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginTop: 10,
          }}
        >
          <div
            style={{
              border: "1px solid #888",
              width: "min-content",
            }}
          >
            <TilemapDisplay
              imageStore={imageStore}
              tilemap={createTilemapForTilesetPreview(
                tilesets[selectedTileSet],
              )}
              width={250}
              height={250}
              offset={{ x: 0, y: 0 }}
              tileSize={tileSize}
              onPointerDown={(c, ev) => {}}
              onPointerUp={(c, ev) => {}}
              onPointerMove={(c, ev) => {}}
            />
          </div>
        </div>
      )}
    </div>
  );
}
