import { CliError } from "./errors.js";

export interface ClientOpts {
  endpoint: string;
  apiToken: string;
  /** Human-readable identifier (e.g. git config user.name) sent as X-Loomy-Username for audit. Omit to let the server fall back to X-Loomy-User. */
  username?: string | null;
  fetchImpl?: typeof fetch;
  debug?: boolean;
  /** Where debug lines go. Defaults to process.stderr. */
  stderr?: (s: string) => void;
}

interface ProblemJson {
  type?: string;
  title?: string;
  status?: number;
}

export class GatewayClient {
  private fetchImpl: typeof fetch;

  constructor(private opts: ClientOpts) {
    this.fetchImpl = opts.fetchImpl ?? globalThis.fetch;
  }

  private url(path: string): string {
    return this.opts.endpoint.replace(/\/+$/, "") + path;
  }

  private headers(extra: Record<string, string> = {}): Record<string, string> {
    const base: Record<string, string> = {
      authorization: `Bearer ${this.opts.apiToken}`,
    };
    if (this.opts.username) base["x-loomy-username"] = this.opts.username;
    return { ...base, ...extra };
  }

  async getJson<T = unknown>(path: string): Promise<T> {
    const res = await this.safeFetch(this.url(path), { method: "GET", headers: this.headers() });
    return await this.parseResponse<T>(res);
  }

  async deleteJson<T = unknown>(path: string): Promise<T> {
    const res = await this.safeFetch(this.url(path), { method: "DELETE", headers: this.headers() });
    return await this.parseResponse<T>(res);
  }

  async postJson<T = unknown>(path: string, body: unknown): Promise<T> {
    const res = await this.safeFetch(this.url(path), {
      method: "POST",
      headers: this.headers({ "content-type": "application/json" }),
      body: JSON.stringify(body),
    });
    return await this.parseResponse<T>(res);
  }

  async postSse(path: string, body: unknown): Promise<Response> {
    const res = await this.safeFetch(this.url(path), {
      method: "POST",
      headers: this.headers({ "content-type": "application/json", accept: "text/event-stream" }),
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      throw await this.toCliError(res);
    }
    return res;
  }

  private async safeFetch(url: string, init: RequestInit): Promise<Response> {
    const writeStderr = this.opts.stderr ?? ((s: string) => { process.stderr.write(s); });
    if (this.opts.debug) {
      const method = init.method ?? "GET";
      writeStderr(`→ ${method} ${url}\n`);
      const headers = init.headers as Record<string, string> | undefined;
      if (headers) for (const [k, v] of Object.entries(headers)) writeStderr(`    ${k}: ${v}\n`);
    }
    try {
      const res = await this.fetchImpl(url, init);
      if (this.opts.debug) {
        writeStderr(`← ${res.status} ${res.statusText}\n`);
        const ct = res.headers.get("content-type");
        const cl = res.headers.get("content-length");
        if (ct) writeStderr(`    content-type: ${ct}\n`);
        if (cl) writeStderr(`    content-length: ${cl}\n`);
      }
      return res;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new CliError("network", `Cannot reach gateway at ${this.opts.endpoint}: ${msg}`);
    }
  }

  private async parseResponse<T>(res: Response): Promise<T> {
    if (!res.ok) throw await this.toCliError(res);
    const ct = res.headers.get("content-type") ?? "";
    if (ct.includes("application/json")) {
      return (await res.json()) as T;
    }
    return (await res.text()) as unknown as T;
  }

  private async toCliError(res: Response): Promise<CliError> {
    const ct = res.headers.get("content-type") ?? "";
    let title: string | undefined;
    if (ct.includes("application/problem+json") || ct.includes("application/json")) {
      try {
        const body = (await res.json()) as ProblemJson;
        title = body.title;
      } catch {
        // fall through
      }
    }
    const message = title ?? `${res.status} ${res.statusText || ""}`.trim();
    if (res.status === 401) return new CliError("auth", message);
    if (res.status >= 500) return new CliError("http5xx", message);
    return new CliError("http4xx", message);
  }
}
