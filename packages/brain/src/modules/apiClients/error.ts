import { createErrorFactory } from "../../createErrorFactory.js";

export const ApiError = createErrorFactory("ApiError");

export class HttpApiError extends ApiError {
  constructor(
    public readonly statusCode: number,
    message: string
  ) {
    super(message);
  }
}
