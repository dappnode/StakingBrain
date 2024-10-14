import { Request } from "express";
import { Tag } from "@stakingbrain/common"; // Assuming this is defined somewhere

// The query parameters before they are parsed or validated
// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-empty-object-type
export type RequestReceived = Request<{}, any, any, QueryParamsReceived>;

type QueryParamsReceived = {
  format: "pubkey" | "index";
  tag?: Tag[] | Tag; // Can be an array or a single value before validation
};

// The query parameters after they are validated and parsed
// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-empty-object-type
export type RequestParsed = Request<{}, any, any, QueryParamsParsed>;

type QueryParamsParsed = {
  format: "pubkey" | "index";
  tag?: Tag[]; // After validation, tag should be an array
};
