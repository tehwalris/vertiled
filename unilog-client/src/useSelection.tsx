import { useState } from "react";
import { ActionType, Coordinates, Layer, User } from "unilog-shared";
import { ActionRunner } from "./interfaces";

export function addSelectionLayer(
  layers: Layer[],
  users: User[],
  currentUser: string,
  mySelectionTileId: number,
  othersSelectionTileId: number,
) {
  //we assume that all layers start at one and that the first layer has a width and height
  const referenceLayer = layers[0];

  if (!referenceLayer) {
    return layers;
  }

  const data = new Array(referenceLayer.height! * referenceLayer.width!).fill(
    0,
  );

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
}

export function useSelection() {
  const [isSelecting, setIsSelecting] = useState<Coordinates>();

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
    addSelectionLayer,
    handleMoveSelect,
    handleEndSelect,
    handleStartSelect,
  };
}
