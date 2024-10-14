// import from express querystring
import { Tag, tags } from "@stakingbrain/common";
import QueryString from "qs";

export function getAndValidateQueryParameters(requestQuery: QueryString.ParsedQs):
  | {
      format: "pubkey" | "index";
      tag?: Tag[];
    }
  | Error {
  const { tag, format } = requestQuery;
  try {
    return {
      format: getAndValidateFormat(format),
      tag: getAndValidateTag(tag)
    };
  } catch (e) {
    return e;
  }
}

function getAndValidateFormat(
  format: string | QueryString.ParsedQs | string[] | QueryString.ParsedQs[] | undefined
): "pubkey" | "index" {
  if (!format) throw Error("format is required");
  if (format !== "pubkey" && format !== "index") throw Error("format must be pubkey or index");
  return format as "pubkey" | "index";
}

function getAndValidateTag(tag: string | QueryString.ParsedQs | string[] | QueryString.ParsedQs[] | undefined): Tag[] {
  if (!tag) return [];
  if (typeof tag === "string") {
    if (!tags.includes(tag as Tag)) throw Error("Invalid tag");
    return [tag as Tag];
  } else {
    if (!Array.isArray(tag)) throw Error("tag must be an array");
    for (const t of tag) if (!tags.includes(t as Tag)) throw Error("Invalid tag");
    return tag as Tag[];
  }
}
