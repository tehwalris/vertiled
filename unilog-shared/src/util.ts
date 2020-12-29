import {Cursor, Layer, MapWorld, Rectangle, RegularLayer} from ".";
import assert from "assert"

export function unreachable(v: never): never {
  console.warn("unreachable called with", v);
  throw new Error("unreachable");
}

export function getLayer(world: MapWorld, id: number): Layer {
  const layer = world.layers.find((l) => l.id === id);
  if (!layer) {
    throw new Error(`layer with id ${id} not found`);
  }
  return layer;
}

export function isLayerRegular(layer: Layer): layer is RegularLayer {
  return !!layer.width && !!layer.height && !!layer.data;
}


export function extractCursor(world: MapWorld, frame: Rectangle): Cursor {
  const empty = Array(frame.width * frame.height).fill(0);

  const contents = world.layers.filter(isLayerRegular).map( (layer: RegularLayer) => {
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
    }
  }).filter(v => v).map(v => v!);

  return {
    frame: frame,
    contents: contents
  };
}


