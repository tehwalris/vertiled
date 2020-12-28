import { useState, useEffect, useRef } from "react";
import { isEqualWith } from "lodash";

function shallowEqual(a: any, b: any): boolean {
  return isEqualWith(a, b, (va, vb) => va === vb);
}

export function useShallowMemo<T>(cb: () => T): T {
  const lastValueContainerRef = useRef<{ value: T }>();
  const nextValue = cb();
  if (
    !lastValueContainerRef.current ||
    !shallowEqual(lastValueContainerRef.current.value, nextValue)
  ) {
    lastValueContainerRef.current = { value: cb() };
  }
  return lastValueContainerRef.current.value;
}
