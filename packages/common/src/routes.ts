export interface Routes {
  testRoute(): Promise<string>;
}

interface RouteData {
  log?: boolean;
}

export const routesData: { [P in keyof Routes]: RouteData } = {
  testRoute: { log: true },
};
