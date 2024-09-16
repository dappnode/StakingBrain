import { Tag, tags } from "./types.js";

export function isValidTag(tag: Tag): boolean {
  return tags.includes(tag);
}
