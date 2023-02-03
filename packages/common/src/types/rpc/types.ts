// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface RpcResponse<R = any> {
  result?: R;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  error?: { code: number; message: string; data?: any };
}

export interface RpcPayload {
  method: string;
  params: Args;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Args = any[];

export interface IApiRpc {
  start(onConnect: () => void, onError: (errorMessage: string) => void): void;
  call<R>(payload: RpcPayload): Promise<RpcResponse<R>>;
}
