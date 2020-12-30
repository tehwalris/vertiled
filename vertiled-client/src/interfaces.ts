import { Action, Rectangle } from "vertiled-shared";

export interface TileFlips {
  horizontal: boolean;
  vertical: boolean;
  diagonal: boolean;
}

export interface DisplayTile {
  image: CanvasImageSource;
  rectangle: Rectangle;
  flips: TileFlips;
}

export type ActionRunner = (a: Action) => void;
