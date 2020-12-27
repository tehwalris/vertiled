import * as R from "ramda";
import React, { useEffect, useMemo, useRef, useState } from "react";

interface Coordinates {
  x: number;
  y: number;
}

interface Rectangle extends Coordinates {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DisplayTile {
  image: string;
  rect: Rectangle;
}

interface Props {
  getDisplayTiles: (coordinates: Coordinates) => DisplayTile[];
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
