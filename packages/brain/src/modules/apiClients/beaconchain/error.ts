import { ApiError } from "../error.js";

export class BeaconchainApiError extends ApiError {
  constructor(message: string) {
    super(message);
    this.name = "BeaconchainApiError";
  }
}
