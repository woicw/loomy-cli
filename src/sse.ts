export interface SseEvent {
  event: string;
  data: string;
}

export async function* parseSseStream(stream: ReadableStream<Uint8Array>): AsyncIterable<SseEvent> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let event = "";
  let dataLines: string[] = [];

  const flush = (): SseEvent | null => {
    if (dataLines.length === 0 && !event) return null;
    const ev: SseEvent = { event: event || "message", data: dataLines.join("\n") };
    event = "";
    dataLines = [];
    return ev;
  };

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let nl: number;
    while ((nl = buffer.indexOf("\n")) >= 0) {
      const rawLine = buffer.slice(0, nl);
      buffer = buffer.slice(nl + 1);
      const line = rawLine.endsWith("\r") ? rawLine.slice(0, -1) : rawLine;

      if (line === "") {
        const ev = flush();
        if (ev) yield ev;
        continue;
      }
      if (line.startsWith(":")) continue; // comment
      const colon = line.indexOf(":");
      const field = colon < 0 ? line : line.slice(0, colon);
      const fieldValue = colon < 0 ? "" : line.slice(colon + 1).replace(/^ /, "");
      if (field === "event") event = fieldValue;
      else if (field === "data") dataLines.push(fieldValue);
      // id / retry / unknown fields ignored
    }
  }

  // trailing event without final blank line
  buffer += decoder.decode();
  if (buffer.length > 0) {
    // best-effort: split remaining lines
    for (const raw of buffer.split("\n")) {
      const line = raw.endsWith("\r") ? raw.slice(0, -1) : raw;
      if (line === "") continue;
      if (line.startsWith(":")) continue;
      const colon = line.indexOf(":");
      const field = colon < 0 ? line : line.slice(0, colon);
      const fieldValue = colon < 0 ? "" : line.slice(colon + 1).replace(/^ /, "");
      if (field === "event") event = fieldValue;
      else if (field === "data") dataLines.push(fieldValue);
    }
  }
  const last = flush();
  if (last) yield last;
}
