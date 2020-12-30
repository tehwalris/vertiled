import { ITilemap } from "gl-tiled";
export interface Coordinates {
  x: number;
  y: number;
}

export interface Rectangle extends Coordinates {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface State {
  world: ITilemap;
  users: User[];
}

export interface CursorContent {
  layerId: number | undefined;
  data: number[];
}

export interface Cursor {
  frame: Rectangle;
  contents: CursorContent[];
  initialFrame: Rectangle;
}

export interface User {
  id: string;
  selection?: Rectangle;
  cursor?: Cursor;
}
