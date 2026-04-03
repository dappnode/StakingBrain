export interface Manifest {
  notifications?: {
    customEndpoints?: CustomEndpoint[];
  };
}

export interface CustomEndpoint {
  name: string;
  enabled: boolean;
  description: string;
  metric?: {
    treshold: number;
    min: number;
    max: number;
    unit: string;
  };
}
