import assert from "assert";
import { ILayer, ITilelayer, ITilemap, ITileset, TilesetFlags } from "gl-tiled";
import { Coordinates, Cursor, CursorContent, Rectangle } from ".";
import * as R from "ramda";
import { tileSize } from "./constants";

export function unreachable(v: never): never {
  console.warn("unreachable called with", v);
  throw new Error("unreachable");
}

export function createLayer(
  name: string,
  data: number[],
  width: number,
  height: number,
  id: number,
): ILayer {
  return {
    opacity: 1,
    type: "tilelayer",
    visible: true,
    x: 0,
    y: 0,
    name,
    data,
    width,
    height,
    id,
  };
}

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

export function createTilemapFromLayers(
  layers: ILayer[],
  tilesets: ITileset[],
): ITilemap {
  const height = Math.max(
    ...layers.filter(isLayerRegular).map((l) => l.height),
  );
  const width = Math.max(...layers.filter(isLayerRegular).map((l) => l.width));
  const nextlayerid = Math.max(...layers.map((l) => l.id)) + 1;

  return {
    ...createEmptyTilemap(height, width),
    tilesets,
    layers: layers,
    nextlayerid,
  };
}

export function createTilemapForTilesetPreview(
  tileset: ITileset,
  allTilesets: ITileset[],
): ITilemap {
  const countwidth = tileset.imagewidth / tileset.tilewidth;
  const countheight = tileset.imageheight / tileset.tileheight;

  const data = new Array(countwidth * countheight)
    .fill(0)
    .map((_, i) => tileset.firstgid + i);

  return {
    ...createEmptyTilemap(countheight, countwidth),
    tilesets: allTilesets,
    layers: [createLayer("TilesetPreview", data, countwidth, countheight, 1)],
    nextlayerid: 2,
  };
}

export function createEmptyTilemap(height: number, width: number): ITilemap {
  return {
    infinite: false,
    layers: [],
    nextlayerid: 1,
    nextobjectid: 1,
    orientation: "orthogonal",
    renderorder: "right-down",
    tiledversion: "1.4.3",
    tileheight: 32,
    tilesets: [],
    tilewidth: 32,
    type: "map",
    version: 1.4,
    height,
    width,
  };
}

export function getLayer(world: ITilemap, id: number): ILayer {
  const layer = world.layers.find((l) => l.id === id);
  if (!layer) {
    throw new Error(`layer with id ${id} not found`);
  }
  return layer;
}

export function isLayerRegular(layer: ILayer): layer is ITilelayer {
  const l = layer as ITilelayer;
  return !!l.width && !!l.height && !!l.data;
}

export function extractCursor(world: ITilemap, frame: Rectangle): Cursor {
  const empty = Array(frame.width * frame.height).fill(0);

  const contents = world.layers
    .filter(isLayerRegular)
    .map((layer: ITilelayer) => {
      const data = empty.slice();

      // XXX: as per https://doc.mapeditor.org/en/latest/reference/json-map-format/#layer, x and y are always 0 apparently
      assert(layer.x === 0 && layer.y === 0);

      // TODO: optimize for cases w/ no overlap, check rect intersections, etc.

      for (let destY = 0; destY < frame.height; destY++) {
        const globalY = frame.y + destY;
        const srcY = globalY - layer.y;
        if (srcY < 0) {
          continue;
        } else if (srcY >= layer.height) {
          break;
        }

        for (let destX = 0; destX < frame.width; destX++) {
          const globalX = frame.x + destX;
          const srcX = globalX - layer.x;
          if (srcX < 0) {
            continue;
          } else if (srcX >= layer.width) {
            break;
          }

          const destIdx = frame.width * destY + destX;
          const srcIdx = layer.width * srcY + srcX;

          data[destIdx] = layer.data[srcIdx];
        }
      }

      return {
        layerId: layer.id,
        data: data,
      };
    })
    .filter((v) => v)
    .map((v) => v!);

  return { frame, initialFrame: frame, contents };
}

export function mergeCursorOntoLayers(
  oldLayers: ILayer[],
  cursor: Cursor,
  defaultLayerId: number,
): ILayer[] {
  const cursorDataByLayerId = new Map(
    cursor.contents.map((c) => [c.layerId ?? defaultLayerId, c.data]),
  );
  return oldLayers.map((oldLayer) => {
    const cursorData = cursorDataByLayerId.get(oldLayer.id);
    if (
      !cursorData ||
      oldLayer.type !== "tilelayer" ||
      typeof oldLayer.data === "string"
    ) {
      // TODO Why can the layer data be a string?
      return oldLayer;
    }
    const newLayerData = oldLayer.data.map((oldGid, i) => {
      const x = (oldLayer.offsetx || 0) + (i % oldLayer.width);
      const y = (oldLayer.offsety || 0) + Math.floor(i / oldLayer.width);

      const posInCursor = { x: x - cursor.frame.x, y: y - cursor.frame.y };
      if (
        posInCursor.x < 0 ||
        posInCursor.x >= cursor.frame.width ||
        posInCursor.y < 0 ||
        posInCursor.y >= cursor.frame.height
      ) {
        return oldGid;
      }

      const indexInCursor = posInCursor.x + posInCursor.y * cursor.frame.width;
      if (indexInCursor < 0 || indexInCursor >= cursorData.length) {
        throw new Error("unexpected out of bounds in cursor data");
      }
      return cursorData[indexInCursor] || oldGid;
    });
    return { ...oldLayer, data: newLayerData };
  });
}

function makeCursorHighlightLayer(
  cursor: Cursor,
  highlightLayerId: number,
  highlightGid: number,
) {
  const layer: ITilelayer & { data: number[] } = {
    type: "tilelayer",
    id: highlightLayerId,
    name: "cursor-highlight",
    width: cursor.frame.width,
    height: cursor.frame.height,
    x: 0,
    y: 0,
    offsetx: cursor.frame.x * tileSize,
    offsety: cursor.frame.y * tileSize,
    opacity: 1,
    visible: true,
    data: (new Uint32Array(
      cursor.frame.height * cursor.frame.width,
    ) as any) as number[], // HACK not actually a number[]
  };

  for (let x = 0; x < cursor.frame.width; x++) {
    for (let y = 0; y < cursor.frame.height; y++) {
      const i = x + y * cursor.frame.width;
      if (cursor.contents.some((c) => c.data[i])) {
        layer.data[i] = highlightGid;
      }
    }
  }

  return layer;
}

export function addCursorOnNewLayers(
  oldLayers: ILayer[],
  cursor: Cursor,
  defaultLayerId: number,
  highlightGid: number,
): ILayer[] {
  const cursorDataByLayerId = new Map(
    cursor.contents.map((c) => [c.layerId ?? defaultLayerId, c.data]),
  );

  let nextLayerId = Math.max(...oldLayers.map((l) => l.id)) + 1;
  const newLayers = R.chain((oldLayer) => {
    const cursorData = cursorDataByLayerId.get(oldLayer.id);
    if (!cursorData) {
      return [oldLayer];
    }
    const cursorLayer: ITilelayer = {
      ...oldLayer,
      type: "tilelayer",
      id: nextLayerId++,
      data: cursorData,
      // as per https://doc.mapeditor.org/en/latest/reference/json-map-format/#layer, x and y are always 0
      x: 0,
      y: 0,
      width: cursor.frame.width,
      height: cursor.frame.height,
      offsetx: cursor.frame.x * tileSize,
      offsety: cursor.frame.y * tileSize,
    };
    return [oldLayer, cursorLayer];
  }, oldLayers);

  const highlightLayer = makeCursorHighlightLayer(
    cursor,
    nextLayerId++,
    highlightGid,
  );
  if (highlightLayer) {
    newLayers.push(highlightLayer);
  }

  return newLayers;
}

export enum MirrorDirection {
  Vertical = "Vertical",
  Horizontal = "Horizontal",
}

export function mirrorLayer(
  l: CursorContent,
  d: MirrorDirection,
  w: number,
  h: number,
): CursorContent {
  return {
    layerId: l.layerId,
    data: l.data.map((_, i, a) => {
      const x = i % w;
      const y = Math.floor(i / w);
      const value =
        a[
          d === MirrorDirection.Horizontal
            ? w - x - 1 + y * w
            : (h - y - 1) * w + x
        ];

      const flags =
        d === MirrorDirection.Horizontal
          ? TilesetFlags.FlippedHorizontal
          : TilesetFlags.FlippedVertical;
      return value ^ flags;
    }),
  };
}

export function mirrorCursor(c: Cursor, d: MirrorDirection): Cursor {
  return {
    ...c,
    contents: c.contents.map((l) =>
      mirrorLayer(l, d, c.frame.width, c.frame.height),
    ),
  };
}
