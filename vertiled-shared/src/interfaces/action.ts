import { Coordinates, Cursor, Rectangle } from "./data";

export type Action =
  | FillRectangleAction
  | SetSelectionAction
  | SetCursorAction
  | SetCursorOffsetAction
  | PasteFromCursorAction
  | AddUserAction
  | RemoveUserAction
  | SetLayerVisibilityAction;

export enum ActionType {
  FillRectangle = "FillRectangle",
  SetSelection = "SetSelection",
  SetCursor = "SetCursor",
  SetCursorOffset = "SetCursorOffset",
  PasteFromCursor = "PasteFromCursor",
  AddUser = "AddUser",
  RemoveUser = "RemoveUser",
  SetLayerVisibility = "SetLayerVisibility",
}

export interface FillRectangleAction {
  type: ActionType.FillRectangle;
  layerIds: number[];
  rectangle: Rectangle;
  tileId: number;
}

export interface SetSelectionAction {
  type: ActionType.SetSelection;
  userId: string;
  selection?: Rectangle;
}

export interface SetCursorAction {
  type: ActionType.SetCursor;
  userId: string;
  cursor?: Cursor;
}

export interface SetCursorOffsetAction {
  type: ActionType.SetCursorOffset;
  userId: string;
  offset: Coordinates;
}

export interface PasteFromCursorAction {
  type: ActionType.PasteFromCursor;
  userId: string;
  defaultLayerId: number;
}

export interface SetLayerVisibilityAction {
  type: ActionType.SetLayerVisibility;
  layerId: number;
  visibility: boolean;
}

export interface AddUserAction {
  type: ActionType.AddUser;
  userId: string;
}

export interface RemoveUserAction {
  type: ActionType.RemoveUser;
  userId: string;
}
