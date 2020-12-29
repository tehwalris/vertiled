import * as glTiled from "gl-tiled";
import React, { useEffect, useRef } from "react";
import { Coordinates } from "unilog-shared";

interface Props {
  onPointerDown?: (coordinates: Coordinates, ev: React.PointerEvent) => void;
  onPointerMove?: (coordinates: Coordinates, ev: React.PointerEvent) => void;
  onPointerUp?: (coordinates: Coordinates, ev: React.PointerEvent) => void;
  onContextMenu?: (ev: React.MouseEvent) => void;

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
  width,
  height,
  offset,
  tileSize,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onContextMenu,
}) => {
  const canvas: React.Ref<HTMLCanvasElement> = useRef(null);
  const canvasWidth = Math.floor(width * devicePixelRatio);
  const canvasHeight = Math.floor(height * devicePixelRatio);

  const render = () => {
    const gl = canvas.current?.getContext("webgl");

    if (!gl) {
      return;
    }

    gl.viewport(0, 0, canvasWidth, canvasHeight);
    tilemap.resizeViewport(canvasWidth, canvasHeight);

    // HACK shader compilation crashes if there are not tilesets
    if (!tilemap.tilesets.filter((tileset) => tileset.images.length).length) {
      return;
    }

    if (tilemap.gl !== gl) {
      tilemap.glInitialize(gl);
    }

    tilemap.draw(
      Math.round(offset.x * tileSize),
      Math.round(offset.y * tileSize),
    );
  };

  useEffect(() => {
    const frameRequestHandle = requestAnimationFrame(() => {
      render();
    });
    return () => {
      cancelAnimationFrame(frameRequestHandle);
    };
  });

  useEffect(() => {
    return () => {
      tilemap.glTerminate();
    };
  }, [tilemap]);

  const canvasScale = 1 / devicePixelRatio;

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
        height={canvasHeight}
        width={canvasWidth}
        onPointerDown={
          onPointerDown &&
          ((ev) => {
            const canvasRect = canvas.current?.getBoundingClientRect()!;
            onPointerDown(
              screenCoordsToTileCoords(canvasRect, ev.clientX, ev.clientY),
              ev,
            );
          })
        }
        onPointerUp={
          onPointerUp &&
          ((ev) => {
            const canvasRect = canvas.current?.getBoundingClientRect()!;
            onPointerUp(
              screenCoordsToTileCoords(canvasRect, ev.clientX, ev.clientY),
              ev,
            );
          })
        }
        onPointerMove={
          onPointerMove &&
          ((ev) => {
            const canvasRect = canvas.current?.getBoundingClientRect();
            onPointerMove(
              screenCoordsToTileCoords(canvasRect, ev.clientX, ev.clientY),
              ev,
            );
          })
        }
        onPointerCancel={() => {}}
        onPointerLeave={() => {}}
        onContextMenu={onContextMenu}
        style={{
          ...styles.canvas,
          imageRendering: "pixelated",
          transform: `scale(${canvasScale})`,
        }}
      ></canvas>
    </div>
  );
};
