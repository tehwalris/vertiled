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
import { isLayerRegular } from "unilog-shared";

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
    <div>
      <List subheader={<ListSubheader>Layer</ListSubheader>} dense>
        {R.reverse(layers).map((layer, i) => (
          <ListItem
            button
            dense
            selected={selectedLayerIds.includes(layer.id)}
            key={layer.id}
            onClick={(ev) => {
              if (ev.ctrlKey || ev.metaKey) {
                const newSelectedLayerIds = selectedLayerIds.filter(
                  (id) => id !== layer.id,
                );
                if (!selectedLayerIds.includes(layer.id)) {
                  newSelectedLayerIds.push(layer.id);
                }
                setSelectedLayerIds(newSelectedLayerIds);
              } else {
                setSelectedLayerIds([layer.id]);
              }
            }}
          >
            <ListItemText
              primary={layer.name + (isLayerRegular(layer) ? "" : " (special)")}
              style={
                layer.id === R.last(selectedLayerIds)
                  ? { textDecoration: "underline" }
                  : undefined
              }
            />
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
