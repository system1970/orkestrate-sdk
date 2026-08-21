#!/usr/bin/env node
import { spawnSync } from "node:child_process";

const GATEWAY = process.env.ORKESTRATE_GATEWAY || "https://orkestrate.space/mcp";
const help = `
Orkestrate SDK CLI — orkestrate.space

Usage:
  npx @orkestrate/sdk add     Add MCP to your agent (via add-mcp)
  npx @orkestrate/sdk help    Show help

Examples:
  npx add-mcp ${GATEWAY} -g -y
  npx @orkestrate/sdk add -g -y
Docs: https://orkestrate.space/docs
`;

const args = process.argv.slice(2);
if (!args[0] || args[0] === "help" || args.includes("--help")) {
  console.log(help);
  process.exit(0);
}
if (args[0] === "add") {
  console.log(`Run: npx add-mcp ${GATEWAY} -g -y`);
  const r = spawnSync("npx", ["add-mcp", GATEWAY, "-g", "-y"], { stdio: "inherit" });
  process.exit(r.status ?? 0);
}
console.log(help);
