import { Property, Rectangle, Tileset } from "unilog-shared";

export type TileMap = Record<number, TileResource>;

export interface TileResource {
  idWithoutFlags: number;
  image: string;
  rectangle: Rectangle;
  properties: Property[];
}

export function generateTileMapFromTileset(tilesets: Tileset[]) {
  const tiles: TileMap = {};
  for (const tileset of tilesets) {
    for (let index = 0; index < tileset.tilecount; index++) {
      tiles[tileset.firstgid + index] = {
        idWithoutFlags: tileset.firstgid + index,
        properties: tileset.tiles?.[index]?.properties ?? [],
        image: tileset.image,
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
