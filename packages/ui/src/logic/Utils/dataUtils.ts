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
