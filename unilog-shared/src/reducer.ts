import { produce } from "immer";
import { getLayer, unreachable } from "./util";
import * as R from "ramda";
import { Action, ActionType } from "./interfaces/action";
import { Layer, State } from "./interfaces/data";

export const initialState: State = {
  world: {
    compressionlevel: -1,
    editorsettings: {
      export: {
        target: ".",
      },
    },
    height: 100,
    infinite: false,
    layers: [],
    nextlayerid: 1,
    nextobjectid: 1,
    orientation: "orthogonal",
    renderorder: "right-down",
    tiledversion: "1.4.3",
    tileheight: 32,
    tilesets: [],
    tilewidth: 32,
    type: "map",
    version: 1.4,
    width: 100,
  },
  cursors: [],
};

export const reducer = (_state: State, action: Action): State =>
  produce(_state, (state) => {
    switch (action.type) {
      case ActionType.SetTile: {
        const layer = getLayer(state.world, action.layerId);
        if (!layer.data || !layer.width || !layer.height) {
          throw new Error(`layer ${action.layerId} has no data field`);
        }
        if (layer.height * layer.width < action.index) {
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
