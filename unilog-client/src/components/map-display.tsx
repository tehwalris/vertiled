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

interface VisualTile {
  image: string;
  rect: Rectangle;
}

interface Props {
  getTile: (coordinates: Coordinates) => VisualTile[];
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
