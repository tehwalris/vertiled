export type Action = SetTileAction | SetCursorAction;

export enum ActionType {
  SetTile = "SetTile",
  SetCursor = "SetCursor",
}

export interface SetTileAction {
  type: ActionType.SetTile;
  id: string;
  layerId: number;
  index: number;
  tileId: number;
}

export interface SetCursorAction {
  type: ActionType.SetCursor;
  id: string;
  x: number;
  y: number;
}
