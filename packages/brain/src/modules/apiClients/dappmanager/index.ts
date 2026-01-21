import logger from "../../logger/index.js";
import { StandardApi } from "../standard.js";
import { Manifest } from "./types.js";

export class DappmanagerApi extends StandardApi {
  /**
   * Fetches the notification settings from the dappmanager.
   */
  public async getPackageManifest({ dnpName }: { dnpName: string }): Promise<Manifest> {
    try {
      const response = await this.request({
        method: "GET",
        endpoint: `/package-manifest/${encodeURIComponent(dnpName)}`,
        headers: {
          Accept: "application/json"
        }
      });
      return response;
    } catch (error) {
      logger.error("Failed to fetch notification settings from dappmanager", error);
      throw error;
    }
  }
}
