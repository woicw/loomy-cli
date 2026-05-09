import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { GatewayClient } from "./client.js";
import { CliError } from "./errors.js";

const realFetch = globalThis.fetch;

function mockFetch(handler: (req: Request) => Response | Promise<Response>) {
  globalThis.fetch = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    const url = typeof input === "string" || input instanceof URL ? new URL(input).toString() : input.url;
    return handler(new Request(url, init));
  }) as any;
}

afterEach(() => {
  globalThis.fetch = realFetch;
});

describe("GatewayClient", () => {
  it("includes Bearer token on requests", async () => {
    let captured: string | null = null;
    mockFetch((req) => {
      captured = req.headers.get("authorization");
      return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "content-type": "application/json" } });
    });
    const c = new GatewayClient({ endpoint: "http://gw", apiToken: "T" });
    await c.getJson("/healthz");
    expect(captured).toBe("Bearer T");
  });

  it("returns parsed JSON on 2xx", async () => {
    mockFetch(() => new Response(JSON.stringify({ a: 1 }), { status: 200, headers: { "content-type": "application/json" } }));
    const c = new GatewayClient({ endpoint: "http://gw", apiToken: "T" });
    expect(await c.getJson("/x")).toEqual({ a: 1 });
  });

  it("throws CliError(http4xx) with problem+json title on 4xx", async () => {
    mockFetch(() => new Response(JSON.stringify({ type: "x", title: "missing X-Loomy-User header", status: 400 }), {
      status: 400, headers: { "content-type": "application/problem+json" },
    }));
    const c = new GatewayClient({ endpoint: "http://gw", apiToken: "T" });
    await expect(c.getJson("/x")).rejects.toThrow(/missing X-Loomy-User/);
    await expect(c.getJson("/x")).rejects.toMatchObject({ kind: "http4xx" });
  });

  it("throws CliError(http5xx) on 5xx", async () => {
    mockFetch(() => new Response(JSON.stringify({ title: "boom", status: 502 }), { status: 502, headers: { "content-type": "application/problem+json" } }));
    const c = new GatewayClient({ endpoint: "http://gw", apiToken: "T" });
    await expect(c.getJson("/x")).rejects.toMatchObject({ kind: "http5xx" });
  });

  it("throws CliError(auth) on 401", async () => {
    mockFetch(() => new Response("Unauthorized", { status: 401 }));
    const c = new GatewayClient({ endpoint: "http://gw", apiToken: "bad" });
    await expect(c.getJson("/x")).rejects.toMatchObject({ kind: "auth" });
  });

  it("postJson sends body and content-type", async () => {
    let body = "";
    let ct: string | null = null;
    mockFetch(async (req) => {
      body = await req.text();
      ct = req.headers.get("content-type");
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    });
    const c = new GatewayClient({ endpoint: "http://gw", apiToken: "T" });
    await c.postJson("/x", { a: 1 });
    expect(body).toBe(JSON.stringify({ a: 1 }));
    expect(ct).toContain("application/json");
  });

  it("postSse returns the raw response body for SSE consumption", async () => {
    mockFetch(() => new Response("event: hi\ndata: 1\n\n", {
      status: 200, headers: { "content-type": "text/event-stream" },
    }));
    const c = new GatewayClient({ endpoint: "http://gw", apiToken: "T" });
    const res = await c.postSse("/x", { a: 1 });
    expect(res.status).toBe(200);
    expect(res.body).toBeTruthy();
  });

  it("network error becomes CliError(network)", async () => {
    globalThis.fetch = vi.fn(async () => { throw new TypeError("fetch failed"); }) as any;
    const c = new GatewayClient({ endpoint: "http://gw", apiToken: "T" });
    await expect(c.getJson("/x")).rejects.toMatchObject({ kind: "network" });
  });
});
