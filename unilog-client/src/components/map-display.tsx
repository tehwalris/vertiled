import React, { useEffect, useRef } from "react";
import { Coordinates, DisplayTile } from "../interfaces";

export type getDisplayTilesFunction = (
  coordinates: Coordinates,
) => DisplayTile[];

interface Props {
  getDisplayTiles: getDisplayTilesFunction;
}

export const MapDisplay: React.FC<Props> = ({ getDisplayTiles }) => {
  const canvas: React.Ref<HTMLCanvasElement> = useRef(null);

  useEffect(() => {
    const ctx = canvas.current?.getContext("2d");
    if (!ctx) {
      return;
    }

    ctx.fillStyle = "red";
    ctx.fillRect(50, 50, 100, 100);

    const displayTiles = getDisplayTiles({ x: 0, y: 0 });
    for (const { image, rectangle } of displayTiles) {
      ctx.drawImage(
        image,
        rectangle.x,
        rectangle.y,
        rectangle.width,
        rectangle.height,
      );
    }
  });

  return <canvas ref={canvas}></canvas>;
};
