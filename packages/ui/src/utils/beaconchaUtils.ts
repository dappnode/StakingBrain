export function hasIndexes(beaconchaUrl: string): boolean {
  return beaconchaUrl.split("=").length > 1;
}
