import { ApiError } from "../../errors/index.js";

export class PostgresApiError extends ApiError {
  constructor(message: string, stack?: string) {
    super({ message, stack });
    this.name = "PostgresApiError"; // Override the name if needed
  }
}
