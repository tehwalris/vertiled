export interface State {
  buckets: Bucket[];
}

export interface Bucket {
  id: string;
  name: string;
  balls: Ball[];
}

export interface Ball {
  id: string;
  color: string;
}
