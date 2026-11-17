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

/** True when a request got an HTTP response, i.e. the server is reachable even if it refused the request. */
export function receivedHttpResponse(error: unknown): boolean {
  for (let e = error; e instanceof Error; e = e.cause) if (e instanceof HttpApiError) return true;
  return false;
}
