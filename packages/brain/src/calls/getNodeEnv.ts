import { mode } from "../index.js";

export async function getNodeEnv(): Promise<string> {
  return mode;
}
