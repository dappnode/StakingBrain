import { ApiError } from "../error.js";

export class ValidatorApiError extends ApiError {
  constructor(message: string) {
    super(message);
    this.name = "ValidatorApiError"; // Override the name if needed
  }
}
