import { ILayer } from "gl-tiled";
import React from "react";
import { FiEye, FiEyeOff } from "react-icons/fi";
import {
  List,
  ListItem as UnstyledListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  ListSubheader,
  makeStyles,
  withStyles,
} from "@material-ui/core";
import { primaryColor } from "../consts";
import * as R from "ramda";

interface Props {
  layers: ILayer[];
  selectedLayerIds: number[];
  setSelectedLayerIds: (selectedLayerIds: number[]) => void;
  onToggleVisibility: (layerId: number, v: boolean) => void;
}

const useStyles = makeStyles((theme) => ({
  root: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: theme.palette.background.paper,
  },
}));

const ListItem = withStyles({
  root: {
    "&$selected": {
      backgroundColor: primaryColor,
      color: "white",
    },
    "&$selected:hover": {
      backgroundColor: primaryColor,
      color: "white",
    },
  },
  selected: {},
})(UnstyledListItem);

export function LayerList({
  layers,
  selectedLayerIds,
  setSelectedLayerIds,
  onToggleVisibility,
}: Props) {
  return (
    <div style={{}}>
      <List subheader={<ListSubheader>Layer</ListSubheader>} dense>
        {layers.map((layer, i) => (
          <ListItem
            button
            dense
            selected={selectedLayerIds.includes(layer.id)}
            key={layer.id}
            onClick={(ev) =>
              setSelectedLayerIds(
                ev.ctrlKey
                  ? R.uniq([...selectedLayerIds, layer.id])
                  : [layer.id],
              )
            }
          >
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
