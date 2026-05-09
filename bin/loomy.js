#!/usr/bin/env node
import("../dist/cli.js").catch((err) => {
  console.error(err?.stack || String(err));
  process.exit(1);
});
