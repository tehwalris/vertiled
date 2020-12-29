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

export interface Cursor {
  frame: Rectangle;
  contents: { layerId: number; data: number[] }[];
  initialFrame: Rectangle;
}

export interface User {
  id: string;
  selection?: Rectangle;
  cursor?: Cursor;
}
