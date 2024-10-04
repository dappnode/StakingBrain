export interface AvgHostMetrics {
  avgCpuTemperature: number;
  avgCpuUsage: number;
  avgMemoryUsage: number;
  ioUtilizationPerDisk: {
    [disk: string]: number;
  };
}
