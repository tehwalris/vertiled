import { GLTilemap, ILayer, ITilemap, TGLLayer } from "gl-tiled";
import React, { useEffect, useMemo } from "react";
import { Coordinates } from "vertiled-shared";
import { isLayerRegular } from "vertiled-shared";
import { neutralWorldColor } from "../consts";
import { ImageStore } from "../image-store";
import { useShallowMemo } from "../use-shallow-memo";
import { MapDisplay, PointerEventHandler } from "./map-display";

interface Props {
  onPointerDown: PointerEventHandler;
  onPointerUp: PointerEventHandler;
  onPointerMove: PointerEventHandler;
  onWheel: React.WheelEventHandler;
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
  onWheel,
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
    const newLayers: ILayer[] = tilemap.layers as any;
    const addedLayers = newLayers.filter(
      (newLayer) => !glTilemap.desc.layers.includes(newLayer),
    );
    const removedLayers = glTilemap.desc.layers.filter(
      (oldLayer) => !newLayers.includes(oldLayer),
    );

    for (const layer of removedLayers) {
      glTilemap.destroyLayerFromDesc(layer);
    }
    for (const layer of addedLayers) {
      glTilemap.createLayerFromDesc(layer);
    }

    glTilemap.desc.layers = [...newLayers];

    // HACK reorder the (private) layers to match the order in our world
    const glTilemapPrivate = (glTilemap as any) as {
      _layers: TGLLayer[];
    };
    glTilemapPrivate._layers = newLayers
      .filter((desc) => isLayerRegular(desc))
      .map((desc) => {
        const glLayer = glTilemapPrivate._layers.find(
          (glLayer) => glLayer.desc === desc,
        );
        if (!glLayer) {
          throw new Error("expected private layer to exist");
        }
        return glLayer;
      });

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
      onWheel={onWheel}
      onContextMenu={(ev) => ev.preventDefault()}
    ></MapDisplay>
  );
};
