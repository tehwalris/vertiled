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
}) => {
  const canvas: React.Ref<HTMLCanvasElement> = useRef(null);

  useEffect(() => {
    const ctx = canvas.current?.getContext("2d");
    if (!ctx) {
      return;
    }

    // TODO not necessary to clear background, this is only for debugging
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, width, height);

    const displayTiles = getDisplayTiles({ x: 0, y: 0 });
    console.log("DEBUG", displayTiles);
    for (const { image, rectangle } of displayTiles) {
      ctx.drawImage(
        image,
        rectangle.x,
        rectangle.y,
        rectangle.width,
        rectangle.height,
        0,
        0,
        rectangle.width,
        rectangle.height,
      );
    }
  });

  const canvasWidth = Math.floor((width / pixelScale) * devicePixelRatio);
  const canvasHeight = Math.floor((height / pixelScale) * devicePixelRatio);

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
