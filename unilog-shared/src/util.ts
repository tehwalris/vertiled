import { ILayer, ITilelayer, ITilemap } from "gl-tiled";
import { Cursor, Rectangle } from ".";

export function unreachable(v: never): never {
  console.warn("unreachable called with", v);
  throw new Error("unreachable");
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

          const destIdx = frame.height * destY + destX;
          const srcIdx = layer.height * srcY + srcX;

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

  return {
    frame: frame,
    contents: contents,
  };
}
