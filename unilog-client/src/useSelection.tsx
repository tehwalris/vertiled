import { useCallback, useEffect, useMemo, useState } from "react";
import { ActionType, Coordinates, Layer, Tileset, User } from "unilog-shared";
import { MapWorld } from "unilog-shared/src";
import { ImageStore } from "./image-store";
import { ActionRunner } from "./interfaces";

const uiTilesImageUrl = "ui-tiles.png";

export function useSelection(tilesets: Tileset[], imageStore: ImageStore) {
  const [isSelecting, setIsSelecting] = useState<Coordinates>();

  const uiFirstGid = tilesets.reduce(
    (a, b) => Math.max(a, b.firstgid + b.tilecount),
    1,
  );

  useEffect(() => {
    imageStore.getImage(uiTilesImageUrl);
  }, [imageStore]);

  const addSelectionToWorld = useCallback(
    ({ layers, tilesets }: MapWorld, users: User[], currentUser: string) => {
      const mySelectionTileId = uiFirstGid;
      const othersSelectionTileId = uiFirstGid + 1;

      //we assume that all layers start at one and that the first layer has a width and height
      const referenceLayer = layers[0];

      if (!referenceLayer) {
        return layers;
      }

      const data = new Array(
        referenceLayer.height! * referenceLayer.width!,
      ).fill(0);

      const myUser = users.filter((user) => user.id === currentUser);
      const otherUsers = users.filter((user) => user.id !== currentUser);

      for (const user of [...otherUsers, ...myUser]) {
        if (user.selection) {
          const tile =
            user.id === currentUser ? mySelectionTileId : othersSelectionTileId;
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
    },
    [uiFirstGid],
  );

  function handleEndSelect(userId: string, runAction: ActionRunner) {
    setIsSelecting(undefined);
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
    setIsSelecting(c);
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
    if (isSelecting) {
      if (!oldSelection) {
        return;
      }

      const { x, y } = isSelecting;
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
  }

  return {
    addSelectionToWorld,
    handleMoveSelect,
    handleEndSelect,
    handleStartSelect,
  };
}
