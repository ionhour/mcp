# @ionhour/mcp-server

Connect AI assistants to your [IonHour](https://ionhour.com) uptime monitoring workspace using the [Model Context Protocol](https://modelcontextprotocol.io).

## Quick Start

```bash
# Option 1: Interactive login (recommended)
npx @ionhour/mcp-server login

# Option 2: Set your API key manually
export IONHOUR_API_KEY=ionh_your_key_here

# Run the MCP server
npx @ionhour/mcp-server
```

## Setup with AI Assistants

### Smithery

[![smithery badge](https://smithery.ai/badge/@ionhour/mcp-server)](https://smithery.ai/server/@ionhour/mcp-server)

```bash
npx -y @smithery/cli install @ionhour/mcp-server --client claude
```

### Claude Code

```bash
claude mcp add ionhour -- npx @ionhour/mcp-server
```

### Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "ionhour": {
      "command": "npx",
      "args": ["@ionhour/mcp-server"],
      "env": {
        "IONHOUR_API_KEY": "ionh_your_key_here"
      }
    }
  }
}
```

### Cursor

Add to your `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "ionhour": {
      "command": "npx",
      "args": ["@ionhour/mcp-server"],
      "env": {
        "IONHOUR_API_KEY": "ionh_your_key_here"
      }
    }
  }
}
```

### VS Code (Copilot)

Add to your `.vscode/mcp.json`:

```json
{
  "servers": {
    "ionhour": {
      "command": "npx",
      "args": ["@ionhour/mcp-server"],
      "env": {
        "IONHOUR_API_KEY": "ionh_your_key_here"
      }
    }
  }
}
```

### Windsurf

Add to your `~/.codeium/windsurf/mcp_config.json`:

```json
{
  "mcpServers": {
    "ionhour": {
      "command": "npx",
      "args": ["@ionhour/mcp-server"],
      "env": {
        "IONHOUR_API_KEY": "ionh_your_key_here"
      }
    }
  }
}
```

## Getting an API Key

1. Go to your IonHour workspace **Settings > API Keys**
2. Create a new key with **Read & Write** or **Read Only** permission
3. Copy the key (starts with `ionh_`)

## Available Tools

### Workspace
- `get_workspace` - Get workspace details
- `get_workspace_summary` - Overview of projects, checks, and incidents
- `get_workspace_reliability` - Uptime, incident count, and MTTR metrics
- `list_team_members` - List workspace members and roles
- `send_invitation` - Invite users to the workspace

### Projects
- `list_projects` / `create_project` / `update_project`

### Checks (Monitors)
- `register_check` - Create a new monitoring check
- `list_checks` / `list_checks_by_status` / `find_check_by_name`
- `get_check_status` - Detailed status with recent signals
- `get_check_uptime` - Uptime percentage with daily buckets
- `pause_check` / `resume_check`

### Signals (Heartbeats)
- `send_heartbeat` - Send a success signal
- `send_failure_signal` - Report a failure
- `list_signals` - View signal history

### Incidents
- `list_incidents` / `search_incidents` / `get_incident`
- `get_incident_timeline` - Incident history for a check
- `create_incident` / `acknowledge_incident` / `resolve_incident`
- `add_incident_note`

### Deployments
- `create_deployment` - Start a deployment window (auto-pauses checks)
- `end_deployment` - End deployment and resume checks
- `list_deployments`

### Dependencies
- `list_dependencies` / `get_dependency` / `create_dependency`
- `update_dependency_status`

### Status Pages & Alerts
- `list_status_pages` / `create_status_page` / `update_status_page`
- `create_announcement`
- `list_alert_channels` / `create_alert_channel` / `update_alert_channel`
- `list_escalation_rules` / `create_escalation_rule` / `update_escalation_rule`

## CLI Commands

```
npx @ionhour/mcp-server [command] [options]

Commands:
  (default)     Start the MCP server
  login         Authenticate via browser and store API key
  logout        Remove stored credentials
  whoami        Show current authentication status

Options:
  --api-key KEY     IonHour API key (or set IONHOUR_API_KEY env var)
  --base-url URL    MCP base URL (default: https://mcp.ionhour.com)
  --version, -v     Show version
  --help, -h        Show help
```

### `login`

Opens your browser to authenticate with IonHour, then automatically creates and stores an API key:

```bash
npx @ionhour/mcp-server login
```

Credentials are stored at `~/.config/ionhour/credentials.json` (file permissions: 600).
After login, you can run the MCP server without setting `IONHOUR_API_KEY`.

## How It Works

This package runs a local MCP server over **stdio** that proxies requests to the IonHour API. Your AI assistant communicates with this local server, which forwards tool calls to your IonHour workspace.

```
AI Assistant <--stdio--> @ionhour/mcp-server <--HTTPS--> IonHour API
```

## Requirements

- Node.js >= 18
- An IonHour account with an API key

## License

MIT
