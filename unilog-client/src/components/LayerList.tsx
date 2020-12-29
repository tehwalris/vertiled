import { ILayer } from "gl-tiled";
import React from "react";
import { FiEye, FiEyeOff } from "react-icons/fi";

import {
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  ListSubheader,
} from "@material-ui/core";

interface Props {
  layers: ILayer[];
  onToggleVisibility: (layerId: number, v: boolean) => void;
}
export function LayerList({ layers, onToggleVisibility }: Props) {
  return (
    <div style={{}}>
      <List subheader={<ListSubheader>Layer</ListSubheader>} dense>
        {layers.map((layer, i) => (
          <ListItem button dense selected={layer.visible} key={layer.id}>
            <ListItemText primary={layer.name} />
            <ListItemSecondaryAction
              onClick={() => {
                onToggleVisibility(layer.id, !layer.visible);
              }}
            >
              <IconButton
                edge="end"
                aria-label="toggle visability"
                size="small"
              >
                {layer.visible ? <FiEye /> : <FiEyeOff />}
              </IconButton>
            </ListItemSecondaryAction>
          </ListItem>
        ))}
      </List>
    </div>
  );
}
