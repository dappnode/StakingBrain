import { ApiError } from "../error.js";

export class SignerApiError extends ApiError {
  constructor(message: string) {
    super(message);
    this.name = "SignerApiError";
  }
}
