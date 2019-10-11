import React from "react";
import { Ball, Bucket } from "../interfaces";

interface Props {
  bucket: Bucket;
}

export const BucketComponent: React.FC<Props> = ({ bucket }) => (
  <div>{JSON.stringify(bucket)}</div>
);
