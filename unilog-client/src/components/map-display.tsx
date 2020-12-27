import React, { useEffect, useRef } from "react";
import { Coordinates, DisplayTile } from "../interfaces";

export type getDisplayTilesFunction = (
  coordinates: Coordinates,
) => DisplayTile[];

interface Props {
  getDisplayTiles: getDisplayTilesFunction;
}

export const MapDisplay: React.FC<Props> = ({}) => {
  const canvas: React.Ref<HTMLCanvasElement> = useRef(null);

  useEffect(() => {
    const ctx = canvas.current?.getContext("2d");
    if (!ctx) {
      return;
    }

    ctx.fillStyle = "red";
    ctx.fillRect(50, 50, 100, 100);
  });

  return <canvas ref={canvas}></canvas>;
};
