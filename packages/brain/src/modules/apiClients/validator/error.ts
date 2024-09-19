import { ApiError } from "../../errors/index.js";

export class ValidatorApiError extends ApiError {
  constructor(message: string, stack?: string) {
    super({ message, stack });
    this.name = "ValidatorApiError"; // Override the name if needed
  }
}
