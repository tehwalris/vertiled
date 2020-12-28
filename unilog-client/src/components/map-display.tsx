import React, { useEffect, useMemo, useRef } from "react";
import { Coordinates, DisplayTile } from "../interfaces";

export type getDisplayTilesFunction = (
  coordinates: Coordinates,
) => DisplayTile[];

interface Props {
  getDisplayTiles: getDisplayTilesFunction;
  onMouseClick: (coordinates: Coordinates, ev: React.MouseEvent) => void;
  width: number;
  height: number;
  pixelScale: number; // number of physical pixels per sprite pixel
  focus: Coordinates; // coordinates of the tile which will be shown exactly in the center of the canvas (possibly fractional)
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
  getDisplayTiles,
  width,
  height,
  pixelScale,
  focus,
  tileSize,
  onMouseClick,
}) => {
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
    const ctx = canvas.current?.getContext("2d");
    if (!ctx) {
      return;
    }

    // TODO not necessary to clear background, this is only for debugging
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, width, height);

    const firstTileCoords = {
      x: Math.floor(focus.x - canvasWidth / 2 / tileSize),
      y: Math.floor(focus.y - canvasHeight / 2 / tileSize),
    };
    const lastTileCoords = {
      x: Math.ceil(focus.x + canvasWidth / 2 / tileSize),
      y: Math.ceil(focus.y + canvasHeight / 2 / tileSize),
    };

    for (
      let tileCoords = { ...firstTileCoords };
      tileCoords.y <= lastTileCoords.y;
      tileCoords =
        tileCoords.x <= lastTileCoords.x
          ? {
              x: tileCoords.x + 1,
              y: tileCoords.y,
            }
          : { x: firstTileCoords.x, y: tileCoords.y + 1 }
    ) {
      const tileCornerDest = {
        x: Math.floor(
          canvasWidth / 2 + (tileCoords.x - focus.x) * tileSize - tileSize / 2,
        ),
        y: Math.floor(
          canvasHeight / 2 + (tileCoords.y - focus.y) * tileSize - tileSize / 2,
        ),
      };

      const displayTiles = getDisplayTiles(tileCoords);
      for (const displayTile of displayTiles) {
        extractTileImage(displayTile, tempTileCtx);

        const { image, rectangle } = displayTile;
        ctx.drawImage(
          tempTileCtx.canvas,
          tileCornerDest.x,
          tileCornerDest.y,
          rectangle.width,
          rectangle.height,
        );
      }
    }
  };

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
            ((ev.clientX - canvasRect.left) / canvasScale -
              canvasWidth / 2 +
              tileSize / 2) /
              tileSize,
          );
          const canvasY = Math.floor(
            ((ev.clientY - canvasRect.top) / canvasScale -
              canvasHeight / 2 +
              tileSize / 2) /
              tileSize,
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
