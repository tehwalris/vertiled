import { produce, current as immerCurrent } from "immer";
import {
  createEmptyTilemap,
  getLayer,
  isLayerRegular,
  mergeCursorOntoLayers,
  unreachable,
} from "./util";
import { Action, ActionType } from "./interfaces/action";
import { State, User } from "./interfaces/data";
import assert from "assert";
import { tileSize } from "./constants";

export const initialState: State = {
  world: createEmptyTilemap(100, 100),
  users: [],
};

const requireUser = (state: State, action: { userId: string }): User => {
  const user = state.users.find((u) => u.id === action.userId);
  if (!user) {
    throw new Error(`unknown user: ${action.userId}`);
  }
  return user;
};

export const reducer = (_state: State, action: Action): State =>
  produce(_state, (state) => {
    switch (action.type) {
      case ActionType.SetTile: {
        for (const layerId of action.layerIds) {
          const layer = getLayer(state.world, layerId);
          if (!isLayerRegular(layer)) {
            throw new Error(`layer ${layerId} is not an ITilelayer`);
          }
          if (layer.height * layer.width < action.index) {
            throw new Error(
              `index ${action.index} is out of bounds, Layer: ${layerId} w: ${layer.width}, h: ${layer.height}`,
            );
          }
          if (typeof layer.data === "string") {
            throw new Error("layer.data with type string is not supported");
          }
          layer.data[action.index] = action.tileId;
        }
        break;
      }
      case ActionType.SetSelection: {
        const userState = requireUser(state, action);
        userState.selection = action.selection;
        if (action.selection) {
          userState.cursor = undefined;
        }
        break;
      }
      case ActionType.SetCursor: {
        // TODO: validate cursor (layers exist, bounds make sense)
        const userState = requireUser(state, action);
        userState.cursor = action.cursor;
        if (action.cursor) {
          userState.selection = undefined;
        }
        break;
      }
      case ActionType.SetCursorOffset: {
        const cursor = requireUser(state, action).cursor;
        if (!cursor) {
          // HACK don't throw here, because it's very hard to prevent
          // SetCursorOffset from being set if the cursor has already
          // being deleted, because of the async behavior of setState in React.
          return;
        }
        cursor.frame.x = action.offset.x;
        cursor.frame.y = action.offset.y;
        break;
      }
      case ActionType.PasteFromCursor: {
        const userState = requireUser(state, action);
        if (!userState.cursor) {
          throw new Error(`user ${action.userId} has no cursor`);
        }
        state.world.layers = mergeCursorOntoLayers(
          immerCurrent(state.world.layers),
          immerCurrent(userState.cursor),
          action.defaultLayerId,
        );
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
    for (const user of state.users) {
      assert(
        !(user.cursor && user.selection),
        "Shouldn't ever have a cursor and a selection at the same time",
      );
    }
  });
