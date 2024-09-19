import { ApiError } from "../../errors/index.js";

export class BlockExplorerApiError extends ApiError {
  constructor(message: string, stack?: string) {
    super({ message, stack });
    this.name = "BlockExplorerApiError"; // Override the name if needed
  }
}
