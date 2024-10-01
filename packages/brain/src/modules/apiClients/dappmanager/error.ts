import { ApiError } from "../error.js";

export class DappmanagerApiError extends ApiError {
  constructor(message: string) {
    super(message);
    this.name = "DappmanagerApiError";
  }
}
