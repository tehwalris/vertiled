export function unreachable(v: never): never {
  console.warn("unreachable called with", v);
  throw new Error("unreachable");
}
