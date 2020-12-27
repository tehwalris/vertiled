import React, { useEffect, useRef } from "react";
import { Coordinates, DisplayTile } from "../interfaces";

export type getDisplayTilesFunction = (
  coordinates: Coordinates,
) => DisplayTile[];

interface Props {
  getDisplayTiles: getDisplayTilesFunction;
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

export const MapDisplay: React.FC<Props> = ({
  getDisplayTiles,
  width,
  height,
  pixelScale,
  focus,
  tileSize,
}) => {
  const canvas: React.Ref<HTMLCanvasElement> = useRef(null);
  const canvasWidth = Math.floor((width / pixelScale) * devicePixelRatio);
  const canvasHeight = Math.floor((height / pixelScale) * devicePixelRatio);

  useEffect(() => {
    const ctx = canvas.current?.getContext("2d");
    if (!ctx) {
      return;
    }

    // TODO not necessary to clear background, this is only for debugging
    ctx.fillStyle = "black";
    ctx.fillRect(0, 0, width, height);

    const firstTileCoords = {
      x: Math.floor(focus.x - canvasWidth / 2 / tileSize),
      y: Math.floor(focus.y - canvasHeight / 2 / tileSize),
    };
    const lastTileCoords = {
      x: Math.floor(focus.x + canvasWidth / 2 / tileSize),
      y: Math.floor(focus.y + canvasHeight / 2 / tileSize),
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
          canvasWidth / 2 + tileCoords.x * tileSize - focus.x - tileSize / 2,
        ),
        y: Math.floor(
          canvasHeight / 2 + tileCoords.y * tileSize - focus.y - tileSize / 2,
        ),
      };

      const displayTiles = getDisplayTiles({ x: 0, y: 0 });
      if (tileCoords.x === 0 && tileCoords.y === 0) {
        console.log("DEBUG displayTiles", displayTiles);
      }
      for (const { image, rectangle } of displayTiles) {
        ctx.drawImage(
          image,
          rectangle.x,
          rectangle.y,
          rectangle.width,
          rectangle.height,
          tileCornerDest.x,
          tileCornerDest.y,
          rectangle.width,
          rectangle.height,
        );
      }
    }
  });

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
        style={{
          ...styles.canvas,
          imageRendering: "pixelated",
          transform: `scale(${pixelScale / devicePixelRatio})`,
        }}
      ></canvas>
    </div>
  );
};
