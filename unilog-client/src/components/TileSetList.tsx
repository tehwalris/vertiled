import { Layer, Tileset } from "unilog-shared";

interface Props {
  tilesets: Tileset[];
  setSelectedTileSet: (i: number) => void;
  selectedTileSet: number;
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
            key={i}
            onClick={() => setSelectedTileSet(i)}
            className={selectedTileSet === i ? "active" : ""}
          >
            {tileset.name}
          </li>
        ))}
      </ul>
    </div>
  );
}
