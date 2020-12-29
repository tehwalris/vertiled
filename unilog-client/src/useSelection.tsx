import { ILayer, ITileset } from "gl-tiled";
import { useCallback, useRef, useState } from "react";
import { ActionType, Coordinates, isLayerRegular, User } from "unilog-shared";
import { ImageStore } from "./image-store";
import { ActionRunner } from "./interfaces";

const uiTilesImageUrl = "ui-tiles.png";

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
    othersSelectionTileId: uiFirstGid + 1,
  };
  imageStore.getImage(uiTilesImageUrl);
  tilesets.push({
    columns: 9,
    firstgid: uiFirstGid,
    image: "ui-tiles.png",
    imageheight: 32,
    imagewidth: 288,
    margin: 0,
    name: "ui-tiles",
    spacing: 0,
    tilecount: 9,
    tileheight: 32,
    tilewidth: 32,
  });
  return selectionTilesetInfo;
}

export function useSelection(selectionTilesetInfo: SelectionTilesetInfo) {
  const isSelectingRef = useRef<Coordinates>();

  const addSelectionToLayers = useCallback(
    (layers: ILayer[], users: User[], currentUser: string) => {
      //we assume that all layers start at one and that the first layer has a width and height
      const referenceLayer = layers[0];

      if (!referenceLayer) {
        return layers;
      }

      if (!isLayerRegular(referenceLayer)) {
        throw new Error(`layer ${referenceLayer} is not an ITilelayer`);
      }

      const data = new Array(
        referenceLayer.height! * referenceLayer.width!,
      ).fill(0);

      const myUser = users.filter((user) => user.id === currentUser);
      const otherUsers = users.filter((user) => user.id !== currentUser);

      for (const user of [...otherUsers, ...myUser]) {
        if (user.selection) {
          const tile =
            user.id === currentUser
              ? selectionTilesetInfo.mySelectionTileId
              : selectionTilesetInfo.othersSelectionTileId;
          const { x, y, width, height } = user.selection;
          const x1 = Math.min(x, x + width);
          const x2 = Math.max(x, x + width);
          const y1 = Math.min(y, y + height);
          const y2 = Math.max(y, y + height);

          for (let i = x1; i < x2; i++) {
            for (let j = y1; j < y2; j++) {
              data[i + j * referenceLayer.width!] = tile;
            }
          }
        }
      }

      layers.push({
        ...referenceLayer,
        id: Math.max(...layers.map((l) => l.id)) + 1,
        data,
        name: "selection-ui",
      });
    },
    [selectionTilesetInfo],
  );

  function handleEndSelect(userId: string, runAction: ActionRunner) {
    isSelectingRef.current = undefined;
    runAction({
      type: ActionType.SetSelection,
      userId,
      selection: undefined,
    });
  }

  function handleStartSelect(
    c: Coordinates,
    userId: string,
    runAction: ActionRunner,
  ) {
    isSelectingRef.current = c;
    runAction({
      type: ActionType.SetSelection,
      userId,
      selection: {
        ...c,
        width: 1,
        height: 1,
      },
    });
  }

  function handleMoveSelect(
    userId: string,
    users: User[],
    c: Coordinates,
    runAction: ActionRunner,
  ) {
    const oldSelection = users.find((u) => u.id === userId)?.selection;
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
      runAction({
        type: ActionType.SetSelection,
        userId,
        selection: newSelection,
      });
    }
  }

  return {
    addSelectionToLayers,
    handleMoveSelect,
    handleEndSelect,
    handleStartSelect,
  };
}
