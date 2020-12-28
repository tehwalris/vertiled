import React, { useEffect, useMemo, useRef } from "react";
import { DisplayTile } from "../interfaces";
import { getDisplayTilesFunction } from "../get-display-tiles";
import { Coordinates } from "unilog-shared";
import * as glTiled from "gl-tiled";

interface Props {
  tilemap: glTiled.GLTilemap;
  onMouseClick: (coordinates: Coordinates, ev: React.MouseEvent) => void;

  // TODO remove if unused
  pixelScale: number; // number of physical pixels per sprite pixel

  offset: Coordinates; // number of tiles to shift by before drawing. When zero, the (0, 0) tile will draw in the top left corner of the canvas (possibly fractional)
  tileSize: number; // width (and height) of a tile in pixels of the source image
}

const styles = {
  canvas: {
    transformOrigin: "top left",
  } as React.CSSProperties,
};

// extractTileImage draws a single tile from a sprite sheet into the supplied canvas context.
// ctx must have width == height == tileSize
function extractTileImage(tile: DisplayTile, ctx: CanvasRenderingContext2D) {
  ctx.save();

  const tileSize = tile.rectangle.width;
  if (tile.rectangle.height !== tileSize) {
    throw new Error("tiles must be square");
  }

  ctx.translate(tileSize / 2, tileSize / 2);
  if (tile.flips.diagonal) {
    ctx.rotate(-Math.PI / 2);
    ctx.scale(1, -1);
  }
  if (tile.flips.horizontal) {
    ctx.scale(-1, 1);
  }
  if (tile.flips.vertical) {
    ctx.scale(1, -1);
  }
  ctx.translate(-tileSize / 2, -tileSize / 2);

  ctx.drawImage(
    tile.image,
    tile.rectangle.x,
    tile.rectangle.y,
    tileSize,
    tileSize,
    0,
    0,
    tileSize,
    tileSize,
  );

  ctx.restore();
}

export const MapDisplay: React.FC<Props> = ({
  tilemap,
  pixelScale,
  offset,
  tileSize,
  onMouseClick,
}) => {
  const width = tilemap.viewportWidth;
  const height = tilemap.viewportHeight;

  const canvas: React.Ref<HTMLCanvasElement> = useRef(null);
  const canvasWidth = Math.floor((width / pixelScale) * devicePixelRatio);
  const canvasHeight = Math.floor((height / pixelScale) * devicePixelRatio);

  const tempTileCtx = useMemo(() => {
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = tileSize;
    tempCanvas.height = tileSize;
    const tempCtx = tempCanvas.getContext("2d");
    if (!tempCtx) {
      throw new Error("failed to initialize context of temp canvas");
    }
    return tempCtx;
  }, [tileSize]);

  const render = () => {
    const gl = canvas.current?.getContext("webgl");
    if (!gl) {
      return;
    }

    // HACK shader compilation crashes if there are not tilesets
    if (!tilemap.tilesets.filter((tileset) => tileset.images.length).length) {
      return;
    }

    if (tilemap.gl !== gl) {
      console.log("DEBUG tilemap.glInitialize");
      tilemap.glInitialize(gl);
    }

    tilemap.draw();
  };

  useEffect(() => {
    return () => {
      tilemap.glTerminate();
    };
  }, [tilemap]);

  useEffect(() => {
    const frameRequestHandle = requestAnimationFrame(() => {
      render();
    });
    return () => {
      cancelAnimationFrame(frameRequestHandle);
    };
  });

  const canvasScale = pixelScale / devicePixelRatio;

  return (
    <div
      style={{
        width: `${width}px`,
        height: `${height}px`,
      }}
    >
      <canvas
        ref={canvas}
        width={canvasWidth}
        height={canvasHeight}
        onClick={(ev) => {
          const canvasRect = canvas.current?.getBoundingClientRect()!;

          const canvasX = Math.floor(
            (ev.clientX - canvasRect.left) / canvasScale / tileSize,
          );
          const canvasY = Math.floor(
            (ev.clientY - canvasRect.top) / canvasScale / tileSize,
          );

          onMouseClick({ x: canvasX, y: canvasY }, ev);
        }}
        style={{
          ...styles.canvas,
          imageRendering: "pixelated",
          transform: `scale(${canvasScale})`,
        }}
      ></canvas>
    </div>
  );
};
