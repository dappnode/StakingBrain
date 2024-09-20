import { ApiError } from "../error.js";

export class PostgresApiError extends ApiError {
  constructor(message: string) {
    super(message);
    this.name = "PostgresApiError"; // Override the name if needed
  }
}
