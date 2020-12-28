import { Layer, Tileset } from "unilog-shared";
import { ImageStore } from "./image-store";
import { Coordinates, DisplayTile, TileFlips } from "./interfaces";
import { TileMap } from "./tile-map";

export type getDisplayTilesFunction = (
  coordinates: Coordinates,
) => DisplayTile[];

export function makeGetDisplayTiles(
  layers: Layer[],
  tileMap: TileMap,
  imageStore: ImageStore,
  ownCursorCoords: Coordinates,
  tileSize: number,
): getDisplayTilesFunction {
  return ({ x, y }) => {
    const hitLayers = layers.filter(
      (l) =>
        l.width &&
        l.height &&
        l.x + l.width > x &&
        l.x <= x &&
        l.y + l.height > y &&
        l.y <= y,
    );
    const tiles = hitLayers.map((l) => l.data![y * l.width! + x]);

    const displayTiles: DisplayTile[] = tiles
      .map((tileIdWithFlags) => {
        const { idWithoutFlags, flips } = splitGid(tileIdWithFlags);
        if (idWithoutFlags === 0) {
          // Background tile
          return undefined;
        }
        if (!tileMap[idWithoutFlags]) {
          console.error(
            `Could not find tile with ID ${idWithoutFlags}`,
            tileMap,
          );
          return undefined;
        }
        const tile = tileMap[idWithoutFlags];
        const image = imageStore.getImage(tile.image);
        if (!image) {
          return undefined;
        }
        return {
          ...tileMap[idWithoutFlags],
          image,
          flips,
        };
      })
      .filter((tile) => tile)
      .map((tile) => tile!);

    const uiTilesImage = imageStore.getImage("ui-tiles.png"); // TODO save this separately from the "world" tile maps
    if (uiTilesImage) {
      if (
        ownCursorCoords &&
        ownCursorCoords.x === x &&
        ownCursorCoords.y === y
      ) {
        displayTiles.push({
          image: uiTilesImage,
          rectangle: { x: 0, y: 0, width: tileSize, height: tileSize },
          flips: { diagonal: false, horizontal: false, vertical: false },
        });
      }
    }

    return displayTiles;
  };
}

function splitGid(gid: number): { idWithoutFlags: number; flips: TileFlips } {
  return {
    idWithoutFlags: 0x1fffffff & gid,
    flips: {
      horizontal: !!(gid & 0x80000000),
      vertical: !!(gid & 0x40000000),
      diagonal: !!(gid & 0x20000000),
    },
  };
}
