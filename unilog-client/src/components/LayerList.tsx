import { Layer } from "unilog-shared";
import { FiEye, FiEyeOff } from "react-icons/fi";

interface Props {
  layers: Layer[];
  onToggleVisibility: (layerId: number, v: boolean) => void;
}
export function LayerList({ layers, onToggleVisibility }: Props) {
  return (
    <div className="selection-list">
      <h3>Layers</h3>
      <ul>
        {layers.map((layer, i) => (
          <li
            key={layer.id}
            onClick={() => {
              onToggleVisibility(layer.id, !layer.visible);
            }}
            className={layer.visible ? "active" : ""}
          >
            <span>{layer.name}</span>

            {layer.visible ? <FiEye /> : <FiEyeOff />}
          </li>
        ))}
      </ul>
    </div>
  );
}
