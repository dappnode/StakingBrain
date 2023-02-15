export const extractPubkey = async (file: File): Promise<string> => {
  const text = await file.text();
  const json = JSON.parse(text);
  return json.pubkey;
};

export function getEmoji(status: string): string {
  switch (status) {
    case "error":
      return "❌";
    case "imported":
      return "✅";
    case "deleted":
      return "✅";
    default:
      return "⚠️";
  }
}

export function prettyClientDnpName(dnpName: string): string {
  const clientName = dnpName
    .split(".")[0]
    .split("-")
    .find(
      (name) =>
        !name.includes("goerli") &&
        !name.includes("prater") &&
        !name.includes("gnosis")
    );
  if (!clientName) return dnpName;

  return (
    clientName.split(".")[0].charAt(0).toUpperCase() +
    clientName.split(".")[0].slice(1)
  );
}
