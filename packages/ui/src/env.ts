declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    env: any;
  }
}

// change with your own variables
type EnvType = {
  NODE_ENV: string;
};

export const env: EnvType = { ...process.env, ...window.env };
