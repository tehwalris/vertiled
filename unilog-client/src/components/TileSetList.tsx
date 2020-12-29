import { ITileset } from "gl-tiled";
import React, { useState } from "react";
import { Select, MenuItem } from "@material-ui/core";
import { TilemapDisplay } from "./TilemapDisplay";
import { ImageStore } from "../image-store";
import { tileSize } from "../consts";
import { createTilemapForTilesetPrview } from "unilog-shared";

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
    <div>
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
        <div>
          <TilemapDisplay
            imageStore={imageStore}
            tilemap={createTilemapForTilesetPrview(tilesets[selectedTileSet])}
            width={100}
            height={100}
            offset={{ x: 0, y: 0 }}
            tileSize={tileSize}
            onPointerDown={(c, ev) => {}}
            onPointerUp={(c, ev) => {}}
            onPointerMove={(c, ev) => {}}
          />
        </div>
      )}

      <ul></ul>
    </div>
  );
}
