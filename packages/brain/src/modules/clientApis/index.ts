import { ApiParams } from "@stakingbrain/common";

export class StandardApi {
  baseUrl: string;
  host: string;
  authToken?: string;
  keymanagerEndpoint?: string;

  constructor(apiParams: ApiParams) {
    this.authToken = apiParams.authToken;
    this.baseUrl = apiParams.baseUrl;
    this.host = apiParams.host;
    this.keymanagerEndpoint = apiParams.apiPath;
  }

  protected async request(
    method: string,
    url: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    body?: any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): Promise<any> {
    const headers = {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: "",
      Host: "",
    };

    if (this.authToken) {
      headers.Authorization = `Bearer ${this.authToken}`;
    }

    const response = await fetch(url, {
      method,
      headers,
      body: body ? body : undefined,
    });
    if (response.ok) return await response.json();
    throw new Error(response.statusText);
  }

  protected async readText(files: File[]): Promise<string[]> {
    const data: string[] = [];
    for (const file of files) {
      const text = await file.text();
      data.push(text);
    }
    return data;
  }
}
