import {produce} from "immer";
import {getLayer, unreachable} from "./util";
import {Action, ActionType} from "./interfaces/action";
import {State, User} from "./interfaces/data";

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
  users: [],
};

const requireUser = (state: State, action: {userId: string}): User => {
  const user = state.users.find((u) => u.id === action.userId);
  if (!user) {
    throw new Error(`unknown user: ${action.userId}`);
  }
  return user;
}

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
      case ActionType.SetSelection: {
        requireUser(state, action).selection = action.selection;
        break;
      }
      case ActionType.SetCursor: {
        // TODO: validate cursor (layers exist, bounds make sense)
        requireUser(state, action).cursor = action.cursor;
        break;
      }
      case ActionType.MoveCursor: {
        const cursor = requireUser(state, action).cursor;
        if (!cursor) {
          throw new Error(`can't move non-existent cursor for user ${action.userId}`);
        }
        cursor.frame.x = action.offset.x;
        cursor.frame.y = action.offset.y;
        break;
      }
      case ActionType.SetLayerVisibility: {
        const layer = getLayer(state.world, action.layerId);
        layer.visible = action.visibility;
        break;
      }
      case ActionType.AddUser: {
        if (state.users.find((u) => u.id === action.userId)) {
          throw new Error(`user already exists: ${action.userId}`);
        }
        state.users.push({ id: action.userId });
        break;
      }
      case ActionType.RemoveUser: {
        state.users = state.users.filter((u) => u.id !== action.userId);
        break;
      }
      default:
        unreachable(action);
    }
  });
