import { useRef } from "react";

function shallowEqual(a: any, b: any): boolean {
  return (
    Object.keys(a).every((k) => a[k] === b[k]) &&
    Object.keys(b).every((k) => a[k] === b[k])
  );
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
