import { GLTilemap, ILayer, ITilemap } from "gl-tiled";
import React, { useEffect, useMemo } from "react";
import { Coordinates } from "unilog-shared";
import { neutralWorldColor } from "../consts";
import { ImageStore } from "../image-store";
import { useShallowMemo } from "../use-shallow-memo";
import { MapDisplay } from "./map-display";

interface Props {
  onPointerDown: (coordinates: Coordinates, ev: React.PointerEvent) => void;
  onPointerMove: (coordinates: Coordinates, ev: React.PointerEvent) => void;
  onPointerUp: (coordinates: Coordinates, ev: React.PointerEvent) => void;
  imageStore: ImageStore;
  width: number;
  height: number;
  tilemap: ITilemap;
  offset: Coordinates; // number of tiles to shift by before drawing. When zero, the (0, 0) tile will draw in the top left corner of the canvas (possibly fractional)
  tileSize: number; // width (and height) of a tile in pixels of the source image
}

const EMPTY_LAYERS: ILayer[] = [];

export const TilemapDisplay: React.FC<Props> = ({
  tilemap,
  width,
  height,
  offset,
  tileSize,
  imageStore,
  onPointerDown,
  onPointerMove,
  onPointerUp,
}) => {
  const worldForGlTiledWithoutLayers = useShallowMemo(() => ({
    ...tilemap,
    layers: EMPTY_LAYERS,
  }));

  const glTilemap = useMemo(() => {
    const tilemap = new GLTilemap(
      { backgroundcolor: neutralWorldColor, ...worldForGlTiledWithoutLayers },
      { assetCache: imageStore.assetCache },
    );
    return tilemap;
  }, [worldForGlTiledWithoutLayers, imageStore.assetCache]);

  useEffect(() => {
    for (const layer of glTilemap.desc.layers) {
      glTilemap.destroyLayerFromDesc(layer);
    }
    const newLayers = (tilemap.layers as any) as ILayer[]; // TODO avoid cast
    for (const layer of newLayers) {
      glTilemap.createLayerFromDesc(layer);
    }
    glTilemap.desc.layers = [...newLayers];

    // IMPORTANT This is a setter that affects all currently added layers. If repeatTiles is true (default), all layers render incorrectly.
    glTilemap.repeatTiles = false;
  }, [glTilemap, tilemap.layers]);

  return (
    <MapDisplay
      tilemap={glTilemap}
      width={width}
      height={height}
      offset={offset}
      tileSize={tileSize}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onContextMenu={(ev) => ev.preventDefault()}
    ></MapDisplay>
  );
};
