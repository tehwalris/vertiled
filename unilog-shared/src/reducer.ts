import { produce } from "immer";
import { unreachable } from "./util";
import * as R from "ramda";
import { Action, ActionType } from "./interfaces/action";
import { Layer, State } from "./interfaces/data";
import { readFileSync } from "fs";

export const initialState: State = {
  world: JSON.parse(
    readFileSync("../test-world/main.json", { encoding: "utf-8" }),
  ),
  cursors: [],
};

export const reducer = (_state: State, action: Action): State =>
  produce(_state, (state) => {
    function getLayer(id: number): Layer {
      const layer = state.world.layers.find((l) => l.id === id);
      if (!layer) {
        throw new Error(`layer with id ${id} not found`);
      }
      return layer;
    }

    switch (action.type) {
      case ActionType.SetTile: {
        const layer = getLayer(action.layerId);
        if (!layer.data || !layer.width || !layer.height) {
          throw new Error(`layer ${action.layerId} has no data field`);
        }
        if (layer.height * layer.width >= action.index) {
          throw new Error(
            `index ${action.index} is out of bounds, Layer: ${action.layerId} w: ${layer.width}, h: ${layer.height}`,
          );
        }

        layer.data[action.index] = action.tileId;
        break;
      }
      case ActionType.SetCursor: {
        throw new Error("Unimplemented");
      }

      default:
        unreachable(action);
    }
  });
