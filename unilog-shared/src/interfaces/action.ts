import { Rectangle } from "./data";

export type Action =
  | SetTileAction
  | SetSelectionAction
  | AddUserAction
  | RemoveUserAction;

export enum ActionType {
  SetTile = "SetTile",
  SetSelection = "SetSelection",
  AddUser = "AddUser",
  RemoveUser = "RemoveUser",
}

export interface SetTileAction {
  type: ActionType.SetTile;
  id: string;
  layerId: number;
  index: number;
  tileId: number;
}

export interface SetSelectionAction {
  type: ActionType.SetSelection;
  userId: string;
  selection?: Rectangle;
}

export interface AddUserAction {
  type: ActionType.AddUser;
  userId: string;
}

export interface RemoveUserAction {
  type: ActionType.RemoveUser;
  userId: string;
}
