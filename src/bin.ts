#!/usr/bin/env node

import { startProxyServer, resolveConfig } from './index.js';
import { VERSION } from './version.js';
import { loginCommand } from './commands/login.js';
import { logoutCommand } from './commands/logout.js';
import { whoamiCommand } from './commands/whoami.js';
import { setupCommand } from './commands/setup.js';

const HELP_TEXT = `
IonHour MCP Server v${VERSION}

Connect AI assistants to your IonHour monitoring workspace.

Usage:
  npx @ionhour/mcp-server [command] [options]

Commands:
  (default)     Start the MCP server (stdio proxy mode)
  setup         Interactive setup wizard — install MCP server in your editors
  login         Authenticate and store API key
  logout        Remove stored credentials
  whoami        Show current authentication status

Server Options:
  --api-key KEY     IonHour API key (or set IONHOUR_API_KEY env var)
  --base-url URL    IonHour MCP base URL (default: https://mcp.ionhour.com)
  --help, -h        Show this help message

Setup with Claude Code:
  claude mcp add ionhour -- npx @ionhour/mcp-server

Environment Variables:
  IONHOUR_API_KEY       API key for authentication
  IONHOUR_BASE_URL      Base URL override
  IONHOUR_AUTH_URL      Keycloak auth server URL (for login)
  IONHOUR_REALM         Keycloak realm name (for login)
`;

function parseArgs(): {
  command: string;
  apiKey?: string;
  baseUrl?: string;
} {
  const args = process.argv.slice(2);
  const result: { command: string; apiKey?: string; baseUrl?: string } = {
    command: 'serve',
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === 'login' || arg === 'logout' || arg === 'whoami' || arg === 'setup') {
      result.command = arg;
    } else if (arg === '--api-key' && args[i + 1]) {
      result.apiKey = args[++i];
    } else if (arg === '--base-url' && args[i + 1]) {
      result.baseUrl = args[++i];
    } else if (arg === '--help' || arg === '-h') {
      process.stderr.write(HELP_TEXT);
      process.exit(0);
    } else if (arg === '--version' || arg === '-v') {
      process.stderr.write(`${VERSION}\n`);
      process.exit(0);
    }
  }

  return result;
}

async function main(): Promise<void> {
  const { command, ...serverOpts } = parseArgs();

  switch (command) {
    case 'setup':
      await setupCommand();
      break;

    case 'login':
      await loginCommand();
      break;

    case 'logout':
      logoutCommand();
      break;

    case 'whoami':
      whoamiCommand();
      break;

    case 'serve': {
      const config = resolveConfig(serverOpts);
      await startProxyServer(config);
      break;
    }
  }
}

main().catch((error) => {
  process.stderr.write(
    `Error: ${error instanceof Error ? error.message : String(error)}\n`
  );
  process.exit(1);
});
