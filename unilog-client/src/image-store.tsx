import { IAssetCache } from "gl-tiled";
import { useMemo, useRef, useState } from "react";

export interface ImageStore {
  getImage: (url: string) => HTMLImageElement | undefined;
}

export function useImageStore(baseUrl: string) {
  const imageResources = useRef<Map<string, HTMLImageElement>>(new Map());

  const [_renderTrigger, setRenderTrigger] = useState({});

  return useMemo(() => {
    function loadImage(url: string) {
      const imgEl = document.createElement("img");
      imgEl.src = `${baseUrl}/${url}`;
      imgEl.crossOrigin = "anonymous"; // TODO is this necessary
      imageResources.current.set(url, imgEl);
      imgEl.onload = () => {
        setRenderTrigger({});
      };
    }

    function getImage(url: string) {
      const image = imageResources.current.get(url);
      if (!image) {
        loadImage(url);
        return undefined;
      }
      if (!image.complete) {
        return undefined;
      }
      return image;
    }

    function asAssetCache(): IAssetCache {
      const assetCache: IAssetCache = {};
      for (const [url, image] of imageResources.current.entries()) {
        if (image.complete) {
          assetCache[url] = image;
        }
      }
      return assetCache;
    }

    return { getImage, asAssetCache };
  }, [baseUrl, setRenderTrigger, imageResources]);
}
