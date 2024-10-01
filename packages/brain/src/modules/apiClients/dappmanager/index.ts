import logger from "../../logger/index.js";
import { StandardApi } from "../standard.js";
import { NotificationType } from "./types.js";

export class DappmanagerApi extends StandardApi {
  /**
   * Triggers a notification in the dappmanager.
   */
  public async sendDappmanagerNotification({
    notificationType,
    title,
    body
  }: {
    notificationType: NotificationType;
    title: string;
    body: string;
  }): Promise<void> {
    try {
      await this.request({
        method: "POST",
        endpoint: `/notification-send?type=${encodeURIComponent(notificationType)}&title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`
      });
    } catch (error) {
      logger.error("Failed to send notification to dappmanager", error);
      throw error;
    }
  }
}
