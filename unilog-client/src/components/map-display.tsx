import * as R from "ramda";
import React, { useEffect, useMemo, useRef, useState } from "react";

interface Coord {
  x: number;
  y: number;
}

interface Rect extends Coord {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface VisualTile {
  image: string;
  rect: Rect;
}

interface Props {
  getTile: (coord: Coord) => VisualTile[];
}

export const MapDisplay: React.FC<Props> = ({}) => {
  const canvas: React.Ref<HTMLCanvasElement> = useRef(null);

  const context = useMemo(() => canvas.current?.getContext("2d"), [canvas]);

  useEffect(() => {
    if (!context) {
      return;
    }

    context.fillRect(50, 50, 100, 100);
  });

  return <canvas ref={canvas}></canvas>;
};
