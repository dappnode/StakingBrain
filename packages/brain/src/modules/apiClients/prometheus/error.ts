import { ApiError } from "../error.js";

export class PrometheusApiError extends ApiError {
  constructor(message: string) {
    super(message);
    this.name = "PrometheusApiError";
  }
}
