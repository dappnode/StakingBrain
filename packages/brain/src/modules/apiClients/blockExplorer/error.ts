import { ApiError } from "../error.js";

export class BlockExplorerApiError extends ApiError {
  constructor(message: string) {
    super(message);
    this.name = "BlockExplorerApiError"; // Override the name if needed
  }
}
