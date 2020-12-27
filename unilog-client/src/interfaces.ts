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
