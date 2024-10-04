import { Network } from "@stakingbrain/common";
import logger from "../../logger/index.js";
import { StandardApi } from "../standard.js";
import { AvgHostMetrics } from "./types.js";

export class PrometheusApi extends StandardApi {
  private readonly minGenesisTime: number;
  private readonly slotsPerEpoch: number;
  private readonly secondsPerSlot: number;

  constructor({
    baseUrl,
    minGenesisTime,
    slotsPerEpoch,
    secondsPerSlot,
    network
  }: {
    baseUrl: string;
    minGenesisTime: number;
    slotsPerEpoch: number;
    secondsPerSlot: number;
    network: Network;
  }) {
    super({ baseUrl }, network);
    this.minGenesisTime = minGenesisTime;
    this.slotsPerEpoch = slotsPerEpoch;
    this.secondsPerSlot = secondsPerSlot;
  }

  /**
   * Get average host metrics for a given epoch:
   * - avgCpuTemperature
   * - avgCpuUsage
   * - avgMemoryUsage
   * - ioUtilizationPerDisk
   */
  public async getPrometheusMetrics({ epoch }: { epoch: number }): Promise<AvgHostMetrics> {
    try {
      const { startTimestamp, endTimestamp } = this.calculateEpochTimestamps(epoch);

      // Looks like query_range does not allow to request multiple queries in a single reques

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ioDisk: { metric: { device: string }; values: any[] }[] = await this.getPrometheusDataResult({
        query: `irate(node_disk_io_time_seconds_total{instance="node-exporter.dms.dappnode:9100", job="nodeexporter"}[${endTimestamp - startTimestamp}s])`,
        startTimestamp,
        endTimestamp
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ioUtilizationPerDisk = ioDisk.reduce((acc: { [key: string]: any }, disk) => {
        const device = disk.metric.device;
        const utilization = Math.round(parseFloat(disk.values[0][1]) * 100);
        acc[device] = utilization;
        return acc;
      }, {});

      return {
        avgCpuTemperature: await this.getPrometheusAvgMetric({
          query: `avg_over_time(dappmanager_cpu_temperature_celsius{app="dappmanager-custom-metrics", instance="dappmanager.dappnode:80", job="manager_sd", package="dappmanager.dnp.dappnode.eth", service="dappmanager", type="current"}[${endTimestamp - startTimestamp}s])`,
          startTimestamp,
          endTimestamp
        }),
        avgCpuUsage: await this.getPrometheusAvgMetric({
          query: `100 * (1 - avg(rate(node_cpu_seconds_total{instance="node-exporter.dms.dappnode:9100", job="nodeexporter", mode="idle"}[${endTimestamp - startTimestamp}s])) by (instance))`,
          startTimestamp,
          endTimestamp
        }),
        avgMemoryUsage: await this.getPrometheusAvgMetric({
          query: `100 * (1 - avg(node_memory_MemAvailable_bytes{instance="node-exporter.dms.dappnode:9100", job="nodeexporter"} / node_memory_MemTotal_bytes{instance="node-exporter.dms.dappnode:9100", job="nodeexporter"}) by (instance))`,
          startTimestamp,
          endTimestamp
        }),
        ioUtilizationPerDisk
      };
    } catch (error) {
      logger.error("Failed to get prometheus metrics", error);
      throw error;
    }
  }

  /**
   * Query prometheus metric using the endpoint /api/v1/query_range.
   * Used to get the data result for later processing.
   *
   * @see https://prometheus.io/docs/prometheus/latest/querying/api/#range-queries
   */
  private async getPrometheusDataResult({
    query,
    startTimestamp,
    endTimestamp
  }: {
    query: string;
    startTimestamp: number;
    endTimestamp: number;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }): Promise<{ metric: { device: string }; values: any[] }[]> {
    // Construct the request body
    const requestBody = new URLSearchParams({
      query,
      start: startTimestamp.toString(),
      end: endTimestamp.toString(),
      step: `10m` // It should be higher than the time range so it returns only one value
    }).toString();

    return (
      await this.request({
        method: "POST",
        endpoint: `/api/v1/query_range`,
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: requestBody
      })
    ).data.result;
  }

  /**
   * Query prometheus metric using the endpoint /api/v1/query_range.
   * This method assumes there is only 1 metric in the reponse (in the array)
   *
   * @see https://prometheus.io/docs/prometheus/latest/querying/api/#range-queries
   */
  private async getPrometheusAvgMetric({
    query,
    startTimestamp,
    endTimestamp
  }: {
    query: string;
    startTimestamp: number;
    endTimestamp: number;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }): Promise<number> {
    // Construct the request body
    const requestBody = new URLSearchParams({
      query,
      start: startTimestamp.toString(),
      end: endTimestamp.toString(),
      step: `10m` // It should be higher than the time range so it returns only one value
    }).toString();

    return Math.round(
      parseFloat(
        (
          await this.request({
            method: "POST",
            endpoint: `/api/v1/query_range`,
            headers: {
              "Content-Type": "application/x-www-form-urlencoded"
            },
            body: requestBody
          })
        ).data.result[0].values[0][1]
      )
    );
  }

  private calculateEpochTimestamps(epoch: number): { startTimestamp: number; endTimestamp: number } {
    const startTimestamp = this.minGenesisTime + epoch * this.slotsPerEpoch * this.secondsPerSlot;
    const endTimestamp = startTimestamp + this.slotsPerEpoch * this.secondsPerSlot - 1;
    return {
      startTimestamp,
      endTimestamp
    };
  }
}
