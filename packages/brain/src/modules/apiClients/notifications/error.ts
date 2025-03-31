import { ApiError } from "../error.js";

export class NotificationsApiError extends ApiError {
  constructor(message: string) {
    super(message);
    this.name = "NotificationsApiError";
  }
}
