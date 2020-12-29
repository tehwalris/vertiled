import { Tileset } from "unilog-shared";

interface Props {
  tilesets: Tileset[];
  setSelectedTileSet: (tileset: Tileset) => void;
  selectedTileSet: Tileset | undefined;
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
