import { Network } from "@stakingbrain/common";
import { DappmanagerApi } from "../../../../src/modules/apiClients/index.js";
import { NotificationType } from "../../../../src/modules/apiClients/dappmanager/types.js";

describe.skip("Dappmanager API", () => {
  const dappmanagerApi = new DappmanagerApi({ baseUrl: "http://my.dappnode" }, Network.Holesky);

  it("should send a notification to the dappmanager", async () => {
    const title = "Test title";
    const body = "Test body";

    await dappmanagerApi.sendDappmanagerNotification({ notificationType: NotificationType.Success, title, body });
  });
});
