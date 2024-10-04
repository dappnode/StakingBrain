import { Network } from "@stakingbrain/common";
import { PrometheusApi } from "../../../../src/modules/apiClients/index.js";

describe.skip("Prometheus API", () => {
  const prometheusApi = new PrometheusApi({
    baseUrl: "http://prometheus.dms.dappnode:9090",
    minGenesisTime: 1695902100,
    secondsPerSlot: 12,
    slotsPerEpoch: 32,
    network: Network.Holesky
  });

  it("should get prometheus metrics", async () => {
    const metrics = await prometheusApi.getPrometheusMetrics({ epoch: 83660 });
    console.log(metrics);
  });
});
