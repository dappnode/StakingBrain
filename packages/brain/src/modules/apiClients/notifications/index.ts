import logger from "../../logger/index.js";
import { StandardApi } from "../standard.js";
import { NotificationPayload } from "./types.js";

export class NotificationsApi extends StandardApi {
  /**
   * Sends a notification to the notifier service of the notifications pkg.
   */
  public async sendNotification({ notificationPayload }: { notificationPayload: NotificationPayload }): Promise<void> {
    try {
      await this.request({
        method: "POST",
        endpoint: `/api/v1/notification`,
        body: JSON.stringify(notificationPayload),
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        }
      });
    } catch (error) {
      logger.error("Failed to send notification to dappmanager", error);
      throw error;
    }
  }
}
