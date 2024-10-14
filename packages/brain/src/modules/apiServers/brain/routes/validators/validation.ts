import { Response, NextFunction } from "express";
import { Tag, tags } from "@stakingbrain/common";
import { RequestReceived } from "./types.js";

// Validation middleware for query parameters
export function validateQueryParams(req: RequestReceived, res: Response, next: NextFunction): void {
  const { format, tag } = req.query;

  // Validate format
  if (!format || (format !== "pubkey" && format !== "index")) {
    res.status(400).json({ message: "format is required and must be either 'pubkey' or 'index'" });
    return;
  }

  // Validate tag
  if (tag) {
    // tag may be of type string or array of strings otherwise return 400
    if (typeof tag !== "string" && !Array.isArray(tag)) {
      res.status(400).json({ message: "tag must be a string or an array of strings" });
    }

    // if tag is a string, convert it to an array
    const tagsArray = Array.isArray(tag) ? tag : [tag];
    const invalidTag = tagsArray.find((t) => !tags.includes(t as Tag));

    if (invalidTag) {
      res.status(400).json({ message: `invalid tag received: ${invalidTag}. Allowed tags are ${tags.join(", ")}` });
      return;
    }

    // If validation passed, update req.query.tag to ensure it is always an array for downstream middleware
    req.query.tag = tagsArray;
  }

  next(); // Continue to the next middleware or route handler
}
