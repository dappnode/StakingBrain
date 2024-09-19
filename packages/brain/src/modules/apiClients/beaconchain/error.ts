import { ApiError } from "../../errors/index.js";

export class BeaconchainApiError extends ApiError {
  constructor(message: string, stack?: string) {
    super({ message, stack });
    this.name = "BeaconchainApiError"; // Override the name if needed
  }
}
