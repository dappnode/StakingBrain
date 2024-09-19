import { ApiError } from "../../errors/index.js";

export class SignerApiError extends ApiError {
  constructor(message: string, stack?: string) {
    super({ message, stack });
    this.name = "SignerApiError"; // Override the name if needed
  }
}
