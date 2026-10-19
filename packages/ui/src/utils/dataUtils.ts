import type { GridRowId, GridRowSelectionModel } from "@mui/x-data-grid";

export const extractPubkey = async (file: File): Promise<string> => {
  const text = await file.text();
  const json = JSON.parse(text);
  return json.pubkey;
};

export function getEmoji(status: string | boolean): string {
  switch (status) {
    case "error":
    case false:
      return "❌";
    case "imported":
    case "deleted":
    case true:
      return "✅";
    default:
      return "⚠️";
  }
}

export function prettyClientDnpName(dnpName: string): string {
  const clientName = dnpName
    .split(".")[0]
    .split("-")
    .find((name) => !name.includes("gnosis") && !name.includes("lukso") && !name.includes("hoodi"));
  if (!clientName) return dnpName;

  return clientName.split(".")[0].charAt(0).toUpperCase() + clientName.split(".")[0].slice(1);
}

/** Keep bulk actions explicit even when the grid emits a select-all exclusion model. */
export function selectedGridRowIds(selection: GridRowSelectionModel, rows: { id: GridRowId }[]): GridRowId[] {
  return rows
    .map(({ id }) => id)
    .filter((id) => (selection.type === "include" ? selection.ids.has(id) : !selection.ids.has(id)));
}
