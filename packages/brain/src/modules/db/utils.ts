import { Tag, tags } from "@stakingbrain/common";

export function isValidTag(tag: Tag): boolean {
  return tags.includes(tag);
}
