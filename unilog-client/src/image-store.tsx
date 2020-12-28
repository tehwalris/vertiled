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

    return { getImage };
  }, [baseUrl, setRenderTrigger, imageResources]);
}
