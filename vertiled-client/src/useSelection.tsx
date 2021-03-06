import { ILayer, ITileset } from "gl-tiled";
import { useCallback, useRef } from "react";
import { Coordinates, isLayerRegular, Rectangle } from "vertiled-shared";
import { ImageStore } from "./image-store";

const uiTilesImageUrl = "ui-tiles.png";

type SetSelectionCallback = (selection: Rectangle | undefined) => void;

export interface SelectionTilesetInfo {
  mySelectionTileId: number;
  othersSelectionTileId: number;
}

export function addSelectionToTilesets(
  tilesets: ITileset[],
  imageStore: ImageStore,
): SelectionTilesetInfo {
  const uiFirstGid = tilesets.reduce(
    (a, b) => Math.max(a, b.firstgid + b.tilecount),
    1,
  );
  const selectionTilesetInfo: SelectionTilesetInfo = {
    mySelectionTileId: uiFirstGid,
    othersSelectionTileId: uiFirstGid + 9,
  };
  imageStore.getImage(uiTilesImageUrl);
  tilesets.push({
    columns: 9,
    firstgid: uiFirstGid,
    image: "ui-tiles.png",
    imageheight: 64,
    imagewidth: 288,
    margin: 0,
    name: "ui-tiles",
    spacing: 0,
    tilecount: 18,
    tileheight: 32,
    tilewidth: 32,
  });
  return selectionTilesetInfo;
}

export function useSelection(selectionTilesetInfo: SelectionTilesetInfo) {
  const isSelectingRef = useRef<Coordinates>();

  const makeSelectionLayer = useCallback(
    (
      layers: ILayer[],
      mySelection: Rectangle | undefined,
      otherSelections: Rectangle[],
    ): ILayer | undefined => {
      const referenceLayer = layers.find(
        (l) => isLayerRegular(l) && typeof l.data !== "string",
      );
      if (!referenceLayer) {
        return undefined;
      }

      if (
        !isLayerRegular(referenceLayer) ||
        typeof referenceLayer.data === "string"
      ) {
        throw new Error(`layer ${referenceLayer} is not an ITilelayer`);
      }

      const data = new Uint32Array(referenceLayer.data.length);

      const allSelections: [Rectangle, boolean][] = [
        ...otherSelections.map((s) => [s, false] as [Rectangle, boolean]),
      ];
      if (mySelection) {
        allSelections.push([mySelection, true]);
      }
      if (!allSelections) {
        return undefined;
      }

      for (const [selection, isMySelection] of allSelections) {
        if (selection) {
          const tile = isMySelection
            ? selectionTilesetInfo.mySelectionTileId
            : selectionTilesetInfo.othersSelectionTileId;
          const { x, y, width, height } = selection;
          const clampX = (x: number) =>
            Math.max(0, Math.min(referenceLayer.width - 1, x));
          const clampY = (y: number) =>
            Math.max(0, Math.min(referenceLayer.height - 1, y));
          const x1 = clampX(Math.min(x, x + width));
          const x2 = clampX(Math.max(x, x + width));
          const y1 = clampY(Math.min(y, y + height));
          const y2 = clampY(Math.max(y, y + height));

          for (let x = x1; x < x2; x++) {
            for (let y = y1; y < y2; y++) {
              data[x + y * referenceLayer.width] = tile;
            }
          }
        }
      }

      return {
        ...referenceLayer,
        id: Math.max(...layers.map((l) => l.id)) + 1,
        data: (data as any) as number[], // HACK This is actually a Int32Array
        name: "selection-ui",
      };
    },
    [selectionTilesetInfo],
  );

  function handleEndSelect(setSelection: SetSelectionCallback) {
    isSelectingRef.current = undefined;
    setSelection(undefined);
  }

  function handleStartSelect(
    c: Coordinates,
    setSelection: SetSelectionCallback,
  ) {
    isSelectingRef.current = c;
    setSelection({
      ...c,
      width: 1,
      height: 1,
    });
  }

  function handleMoveSelect(
    c: Coordinates,
    oldSelection: Rectangle | undefined,
    setSelection: SetSelectionCallback,
  ) {
    if (!isSelectingRef.current || !oldSelection) {
      return;
    }
    const { x, y } = isSelectingRef.current;
    const x1 = Math.min(x, c.x);
    const x2 = Math.max(x, c.x);
    const y1 = Math.min(y, c.y);
    const y2 = Math.max(y, c.y);

    const newSelection = {
      x: x1,
      y: y1,
      width: x2 - x1 + 1,
      height: y2 - y1 + 1,
    };
    if (
      oldSelection.width !== newSelection.width ||
      oldSelection.height !== newSelection.height
    ) {
      setSelection(newSelection);
    }
  }

  return {
    makeSelectionLayer,
    handleMoveSelect,
    handleEndSelect,
    handleStartSelect,
  };
}
