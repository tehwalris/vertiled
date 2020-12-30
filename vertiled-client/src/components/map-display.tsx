import * as glTiled from "gl-tiled";
import React, { useEffect, useRef } from "react";
import { Coordinates } from "vertiled-shared";

export type PointerEventHandler = (
  coordinates: Coordinates,
  ev: React.PointerEvent,
  nonOffsetCoordinates: Coordinates,
) => void;

interface Props {
  id?: string;
  onPointerDown?: PointerEventHandler;
  onPointerUp?: PointerEventHandler;
  onPointerMove?: PointerEventHandler;
  onWheel: React.WheelEventHandler;
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
  id,
  tilemap,
  width,
  height,
  offset,
  tileSize,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onContextMenu,
  onWheel,
}) => {
  const canvas = useRef<HTMLCanvasElement>(null);
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

  const canvasScale = (1 / devicePixelRatio) * Math.round(devicePixelRatio);

  function tryMakePointerCallback(cb: PointerEventHandler | undefined) {
    return (
      cb &&
      ((ev: React.PointerEvent) => {
        const canvasRect = canvas?.current?.getBoundingClientRect()!;
        const nonOffsetCoordinates = {
          x: (ev.clientX - canvasRect.left) / canvasScale / tileSize,
          y: (ev.clientY - canvasRect.top) / canvasScale / tileSize,
        };
        const offsetCoordinates = {
          x: Math.floor(nonOffsetCoordinates.x + offset.x),
          y: Math.floor(nonOffsetCoordinates.y + offset.y),
        };
        cb(offsetCoordinates, ev, nonOffsetCoordinates);
      })
    );
  }

  return (
    <div
      style={{
        width: `${width}px`,
        height: `${height}px`,
      }}
    >
      <canvas
        id={id}
        ref={canvas}
        height={canvasHeight}
        width={canvasWidth}
        onWheel={onWheel}
        onPointerDown={tryMakePointerCallback(onPointerDown)}
        onPointerUp={tryMakePointerCallback(onPointerUp)}
        onPointerMove={tryMakePointerCallback(onPointerMove)}
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
