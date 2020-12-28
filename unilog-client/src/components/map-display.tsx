import React, { useEffect, useMemo, useRef } from "react";
import { DisplayTile } from "../interfaces";
import { getDisplayTilesFunction } from "../get-display-tiles";
import { Coordinates } from "unilog-shared";
import * as glTiled from "gl-tiled";

interface Props {
  onPointerDown: (coordinates: Coordinates, ev: React.PointerEvent) => void;
  onPointerMove: (coordinates: Coordinates, ev: React.PointerEvent) => void;
  onPointerUp: (coordinates: Coordinates, ev: React.PointerEvent) => void;

  width: number;
  height: number;
  tilemap: glTiled.GLTilemap;
  offset: Coordinates; // number of tiles to shift by before drawing. When zero, the (0, 0) tile will draw in the top left corner of the canvas (possibly fractional)
  tileSize: number; // width (and height) of a tile in pixels of the source image
}

const styles = {
  canvas: {
    transformOrigin: "top left",
  } as React.CSSProperties,
};

export const MapDisplay: React.FC<Props> = ({
  tilemap,
  offset,
  tileSize,
  onPointerDown,
  onPointerMove,
  onPointerUp,
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

  function screenCoordsToTileCoords(
    rect: DOMRect | undefined,
    x: number,
    y: number,
  ): Coordinates {
    if (!rect) {
      throw new Error("error getting canvas DOMRect");
    }
    const canvasX = Math.floor(
      (x - rect.left) / canvasScale / tileSize + offset.x,
    );
    const canvasY = Math.floor(
      (y - rect.top) / canvasScale / tileSize + offset.y,
    );

    return { x: canvasX, y: canvasY };
  }

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
        onPointerDown={(ev) => {
          const canvasRect = canvas.current?.getBoundingClientRect()!;
          onPointerDown(
            screenCoordsToTileCoords(canvasRect, ev.clientX, ev.clientY),
            ev,
          );
        }}
        onPointerUp={(ev) => {
          const canvasRect = canvas.current?.getBoundingClientRect()!;
          onPointerUp(
            screenCoordsToTileCoords(canvasRect, ev.clientX, ev.clientY),
            ev,
          );
        }}
        onPointerMove={(ev) => {
          const canvasRect = canvas.current?.getBoundingClientRect();
          onPointerMove(
            screenCoordsToTileCoords(canvasRect, ev.clientX, ev.clientY),
            ev,
          );
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
