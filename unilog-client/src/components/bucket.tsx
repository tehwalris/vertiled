import React from "react";
import { Bucket } from "../interfaces";

interface Props {
  bucket: Bucket;
}

export const BucketComponent: React.FC<Props> = ({ bucket }) => (
  <div>{JSON.stringify(bucket)}</div>
);
