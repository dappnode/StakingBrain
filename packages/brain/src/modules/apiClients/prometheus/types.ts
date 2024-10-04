export interface AvgHostMetrics {
  startTimestamp: number;
  endTimestamp: number;
  avgCpuTemperature: number;
  avgCpuUsage: number;
  avgMemoryUsage: number;
  ioUtilizationPerDisk: {
    [disk: string]: number;
  };
}
