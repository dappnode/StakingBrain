export interface ValidatorGetFeeResponse {
  data?: {
    pubkey: string;
    ethaddress: string;
  };
  message?: { message: string };
}

export interface ValidatorPostFeeRequest {
  ethaddress: string;
}

export interface ValidatorPostFeeResponse {
  message: { message: string };
}

export interface ValidatorPostRemoteKeysRequest {
  remote_keys: {
    pubkey: string;
    url: string;
  }[];
}

export interface ValidatorPostRemoteKeysResponse {
  data?: {
    status: string;
    message: string;
  }[];
  message?: { message: string };
}
export interface ValidatorGetRemoteKeysResponse {
  data?: {
    pubkey: string;
    url: string;
    readonly: boolean;
  }[];
  message?: { message: string };
}
export interface ValidatorDeleteRemoteKeysRequest {
  pubkeys: string[];
}

export interface ValidatorDeleteRemoteKeysResponse {
  data?: {
    status: string;
    message: string;
  }[];
  message?: { message: string };
}
