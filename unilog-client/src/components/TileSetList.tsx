import { ITileset } from "gl-tiled";

interface Props {
  tilesets: ITileset[];
  setSelectedTileSet: (tileset: ITileset) => void;
  selectedTileSet: ITileset | undefined;
}
export function TileSetList({
  tilesets,
  selectedTileSet,
  setSelectedTileSet,
}: Props) {
  return (
    <div className="selection-list">
      <h3>Tilesets</h3>
      <ul>
        {tilesets.map((tileset, i) => (
          <li
            key={tileset.firstgid}
            onClick={() => setSelectedTileSet(tileset)}
            className={
              selectedTileSet?.firstgid === tileset.firstgid ? "active" : ""
            }
          >
            {tileset.name}
          </li>
        ))}
      </ul>
    </div>
  );
}
