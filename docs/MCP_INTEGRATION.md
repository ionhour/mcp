# IonHour MCP Integration

## Overview

IonHour provides a [Model Context Protocol](https://modelcontextprotocol.io) server that lets AI assistants manage your uptime monitoring workspace using natural language. It works with Claude Code, Claude Desktop, Cursor, VS Code Copilot, Windsurf, and any MCP-compatible client.

## Features

- **49 tools** across 10 domains: checks, signals, incidents, deployments, dependencies, status pages, alerts, escalation, projects, workspace
- **5 resources** for reference data and workflow guides
- **7 prompts** for guided multi-step workflows
- **Full CRUD operations** including create, read, update, and delete
- **Human-readable intervals** for check creation (e.g., "every 5 minutes", "hourly")
- **Two permission levels**: Read Only and Read & Write
- **Secure authentication** via API keys or Keycloak JWT

## How It Works

The `@ionhour/mcp-server` npm package runs a local stdio MCP server that transparently proxies all requests to the IonHour API. Your AI assistant communicates with the local process over stdio, and it forwards tool calls, resource reads, and prompt requests over HTTPS.

```
┌─────────────────────┐      stdio      ┌─────────────────────┐     HTTPS      ┌─────────────────────┐
│   AI Assistant       │ ◄─────────────► │   @ionhour/         │ ◄─────────────► │   IonHour API       │
│   (Claude Code,     │                 │   mcp-server        │                 │   mcp.ionhour.com   │
│    Cursor, etc.)    │                 │   (local proxy)     │                 │                     │
└─────────────────────┘                 └─────────────────────┘                 └─────────────────────┘
      Your machine                           Your machine                          IonHour cloud
```

Since the proxy is fully dynamic, new tools, resources, and prompts added server-side are available immediately without updating the npm package.

## Quick Start

### Step 1: Install and Authenticate

```bash
# Interactive login (recommended) — opens browser, creates API key automatically
npx @ionhour/mcp-server login

# Or set your API key manually
export IONHOUR_API_KEY=ionh_your_key_here
```

### Step 2: Configure Your AI Tool

#### Claude Code

```bash
claude mcp add ionhour -- npx @ionhour/mcp-server
```

#### Claude Desktop

Add to `claude_desktop_config.json`:

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

#### Cursor

Add to `.cursor/mcp.json`:

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

#### VS Code (Copilot)

Add to `.vscode/mcp.json`:

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

#### Windsurf

Add to `~/.codeium/windsurf/mcp_config.json`:

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

#### Smithery

```bash
npx -y @smithery/cli install @ionhour/mcp-server --client claude
```

### Step 3: Start Using Natural Language

Once configured, interact naturally:

- "Set up monitoring for my payment service with a 5-minute heartbeat"
- "Show me all checks that are currently down"
- "Acknowledge incident #42 and add a note that we're investigating"
- "Start a deployment for project 3 version v2.1.0"
- "Create a status page announcement about the API outage"

## Authentication

### API Keys

1. Go to your IonHour workspace **Settings > API Keys**
2. Create a key with the desired permission level:
   - **Read & Write** — Full access to all tools (create, update, delete, send signals)
   - **Read Only** — View-only access (list, get, search tools only)
3. Copy the key (starts with `ionh_`)

### Permission Model

Tools are filtered by permission level at the server:

| Permission | Available Scopes |
|------------|-----------------|
| Read Only | `view`, `status` |
| Read & Write | All scopes: `view`, `status`, `create`, `update`, `delete`, `register`, `pause`, `resume`, `send`, `acknowledge`, `resolve`, `invite` |

Write tools called with a Read Only key return a permission error.

### Credential Storage

When using `npx @ionhour/mcp-server login`, credentials are stored at:

```
~/.config/ionhour/credentials.json  (file permissions: 600)
```

The resolution order for the API key is:
1. `--api-key` CLI flag
2. `IONHOUR_API_KEY` environment variable
3. Stored credentials file

## Available MCP Tools

### Workspace

#### `get_workspace`
Get the workspace this API key is scoped to.

#### `whoami`
Returns info about the authenticated API key: workspace ID, user ID, permission level, auth method.

#### `get_workspace_summary`
High-level summary: project count, checks grouped by status, active incident count.

#### `get_workspace_reliability`
Workspace-wide reliability metrics over a time range.

**Parameters:**
- `daysBack` (optional, 1-90, default: 7): Number of days to look back

#### `list_team_members`
List workspace members with their roles.

#### `send_invitation`
Send workspace invitations to one or more email addresses.

**Parameters:**
- `emails` (required, 1-10): Array of email addresses
- `role` (optional): `member` or `viewer` (default: `member`)

### Projects

#### `list_projects`
List all projects in the workspace.

#### `create_project`
Create a new project.

**Parameters:**
- `name` (required): Project name
- `environment` (optional): `prod` or `staging` (default: `prod`)

#### `update_project`
Update a project's name or environment.

**Parameters:**
- `projectId` (required): Project ID
- `name` (optional): New name
- `environment` (optional): `prod` or `staging`

### Checks (Outbound HTTP Probes)

IonHour probes a URL you own on a schedule and alerts on failure.

#### `register_check` (deprecated — tombstoned)

`register_check` is a deprecated alias that no longer creates anything. Calling it returns a structured error and creates no monitor. It historically created a **Job** (inbound heartbeat monitor), not a check, which was a common point of confusion.

**Migrate to:**
- `register_job` — if you want an inbound heartbeat monitor (your cron/worker pings IonHour). This is what `register_check` used to create.
- `create_check` — if you want an outbound HTTP probe (IonHour probes your URL). See below.

#### `create_check`
Create an outbound check (HTTP probe): IonHour probes the given URL on a schedule and alerts on failure.

**Parameters:**
- `name` (required): Check name
- `url` (required): Target URL to probe (http/https)
- `projectId` or `dependencyId` (required, exactly one)
- `intervalSeconds` (optional, 10-3600): Interval in seconds. Ignored if `interval` is provided.
- `interval` (optional): Human-readable interval (e.g., "every 5 minutes", "every hour", "hourly"). Takes priority over `intervalSeconds`.
- `graceSeconds` (optional, 5-60): Grace period before LATE status

**Human-readable intervals:**

| Input | Seconds |
|-------|---------|
| `every 5 minutes` / `every 5 min` | 300 |
| `every 10 minutes` | 600 |
| `every 15 minutes` | 900 |
| `every 30 minutes` / `every half hour` | 1800 |
| `every hour` / `hourly` | 3600 |
| `every N minutes` | N * 60 |

**Example prompts:**
- "Create a check called 'api-health' in project 1 that probes https://api.example.com/health every 5 minutes"
- "Add an hourly outbound check for the payment service status URL"

#### `list_checks`
List checks in workspace, optionally filtered by project.

**Parameters:**
- `projectId` (optional): Filter by project

#### `list_checks_by_status`
List checks filtered by status.

**Parameters:**
- `status` (required): `NEW`, `OK`, `LATE`, `DOWN`, `PAUSED`, or `RESUMED`
- `projectId` (optional): Narrow by project

#### `find_check_by_name`
Search for checks by name (case-insensitive partial match).

**Parameters:**
- `name` (required): Full or partial check name

#### `get_check_status`
Get detailed check status with recent signals. Provide either `checkId` or `token`.

**Parameters:**
- `checkId` (optional): Check ID
- `token` (optional): Check token

#### `get_check_uptime`
Calculate uptime percentage over a time range with daily buckets.

**Parameters:**
- `checkId` (required): Check ID
- `daysBack` (optional, 1-90, default: 7): Days to look back

#### `pause_check`
Pause a check (stops monitoring). Provide either `checkId` or `token`.

#### `resume_check`
Resume a paused check. Provide either `checkId` or `token`.

#### `delete_check`
Permanently delete a check. Cleans up signals and incidents. **Cannot be undone.**

**Parameters:**
- `checkId` (required): Check ID to delete

### Signals (Heartbeats)

#### `send_heartbeat`
Send a success heartbeat to a check. Triggers the full pipeline: status update, incident resolution, SSE events.

**Parameters:**
- `token` (required): Check token
- `payload` (optional): JSON payload (e.g., dependency statuses)
- `source` (optional): Signal source identifier (default: `mcp-agent`)

#### `send_failure_signal`
Send a failure signal to a check (e.g., job failed, process crashed).

**Parameters:**
- `token` (required): Check token
- `payload` (optional): JSON payload with failure details
- `source` (optional): Signal source identifier
- `exitCode` (optional): Process exit code

#### `list_signals`
List recent signals for a check.

**Parameters:**
- `token` (required): Check token
- `page` (optional, default: 1): Page number
- `limit` (optional, default: 20): Number of signals to return

### Incidents

#### `list_incidents`
List incidents in the workspace.

**Parameters:**
- `state` (optional): `ACTIVE` or `RESOLVED`

#### `search_incidents`
Search incidents by title text, state, or severity.

**Parameters:**
- `state` (optional): `ACTIVE` or `RESOLVED`
- `searchText` (optional): Text to match against incident title
- `limit` (optional, 1-50, default: 20): Max results

#### `get_incident`
Get detailed information about a specific incident.

**Parameters:**
- `incidentId` (required): Incident ID

#### `get_incident_timeline`
Get incident history for a specific check with timing and acknowledgment details.

**Parameters:**
- `checkId` (required): Check ID
- `limit` (optional, 1-50, default: 10): Max incidents to return

#### `acknowledge_incident`
Acknowledge an active incident.

**Parameters:**
- `incidentId` (required): Incident ID

#### `resolve_incident`
Manually resolve an incident.

**Parameters:**
- `incidentId` (required): Incident ID
- `message` (optional): Resolution message

#### `create_incident`
Create a manual incident.

**Parameters:**
- `title` (required): Incident title/summary
- `severity` (optional): `CRITICAL` or `WARNING` (default: `CRITICAL`)
- `checkId` (optional): Check ID to associate with
- `description` (optional): Incident description

#### `add_incident_note`
Add a note to an incident.

**Parameters:**
- `incidentId` (required): Incident ID
- `body` (required): Note content

### Deployments

#### `create_deployment`
Start a deployment window. Auto-pauses associated checks.

**Parameters:**
- `projectId` (required): Project ID
- `name` (optional): Deployment name
- `version` (optional): Release version (e.g., "v1.4.2")

#### `end_deployment`
End an active deployment. Resumes any auto-paused checks.

**Parameters:**
- `deploymentId` (required): Deployment ID

#### `list_deployments`
List deployment windows for a project.

**Parameters:**
- `projectId` (required): Project ID
- `status` (optional): `SCHEDULED`, `ACTIVE`, or `ENDED`

### Dependencies

#### `list_dependencies`
List external dependencies, optionally by category.

**Parameters:**
- `category` (optional): `DATABASE`, `CACHE`, `API`, `QUEUE`, `STORAGE`, or `OTHER`

#### `get_dependency`
Get dependency details with linked checks.

**Parameters:**
- `dependencyId` (required): Dependency ID

#### `create_dependency`
Register an external dependency.

**Parameters:**
- `name` (required): Dependency name
- `category` (optional): `DATABASE`, `CACHE`, `API`, `QUEUE`, `STORAGE`, or `OTHER`
- `url` (optional): Dependency URL
- `description` (optional): Description

#### `update_dependency_status`
Update a dependency's operational status.

**Parameters:**
- `dependencyId` (required): Dependency ID
- `status` (required): `NEW`, `OK`, or `DOWN`

#### `delete_dependency`
Delete an external dependency. **Cannot be undone.**

**Parameters:**
- `dependencyId` (required): Dependency ID

### Status Pages

#### `list_status_pages`
List all status pages with visibility, enabled state, and component counts.

#### `create_status_page`
Create a new status page.

**Parameters:**
- `name` (required, max 255): Display name
- `slug` (required, max 128): URL slug (lowercase, numbers, hyphens)
- `visibility` (optional): `PUBLIC` or `PRIVATE` (default: `PUBLIC`)

#### `update_status_page`
Update an existing status page.

**Parameters:**
- `statusPageId` (required): Status page ID
- `name`, `slug`, `enabled`, `visibility`, `primaryColor`, `backgroundColor`, `logoUrl`, `faviconUrl`, `showUptimeHistory`, `showIncidentHistory` (all optional)

#### `create_announcement`
Post a status update announcement.

**Parameters:**
- `statusPageId` (required): Status page ID
- `title` (required, max 255): Announcement title
- `body` (required): Update body text
- `status` (optional): `INVESTIGATING`, `IDENTIFIED`, `MONITORING`, or `RESOLVED` (default: `INVESTIGATING`)
- `impact` (optional): `NONE`, `MINOR`, `MAJOR`, or `CRITICAL` (default: `MINOR`)

### Alert Channels

#### `list_alert_channels`
List notification channels configured in the workspace.

**Parameters:**
- `type` (optional): `email`, `slack`, or `webhook`

#### `create_alert_channel`
Create an email or webhook notification channel. Slack requires OAuth setup in the dashboard.

**Parameters:**
- `type` (required): `email` or `webhook`
- `name` (required, max 128): Display name
- `enabled` (optional, default: true)
- `to` (optional): Email recipients array (required for email type)
- `webhookUrl` (optional): Webhook URL (required for webhook type)

#### `update_alert_channel`
Update channel name or enabled state.

**Parameters:**
- `channelId` (required): Alert channel ID
- `name`, `enabled` (all optional)

#### `delete_alert_channel`
Delete a notification channel. **Cannot be undone.**

**Parameters:**
- `channelId` (required): Alert channel ID

### Escalation Rules

#### `list_escalation_rules`
List escalation rules for a project.

**Parameters:**
- `projectId` (required): Project ID

#### `create_escalation_rule`
Link a project to an alert channel with a delay.

**Parameters:**
- `projectId` (required): Project ID
- `alertChannelId` (required): Alert channel ID
- `delayMinutes` (required, min: 0): Minutes after incident before escalation (0 = immediate)
- `enabled` (optional, default: true)

#### `update_escalation_rule`
Update delay or enabled state.

**Parameters:**
- `ruleId` (required): Escalation rule ID
- `delayMinutes` (optional): New delay in minutes
- `enabled` (optional)

#### `delete_escalation_rule`
Delete an escalation rule. **Cannot be undone.**

**Parameters:**
- `ruleId` (required): Escalation rule ID

## Available MCP Resources

Resources provide reference data that AI assistants can browse without calling tools.

| URI | Name | Type | Description |
|-----|------|------|-------------|
| `ionhour://enums` | `ionhour_enums` | `application/json` | All IonHour enums: check statuses, incident states, severities, roles, plans, etc. |
| `ionhour://checks/schema` | `check_creation_schema` | `application/json` | Check creation schema with field constraints, valid values, and the status lifecycle state machine |
| `ionhour://help/ping-formats` | `ping_formats_help` | `text/markdown` | Heartbeat integration guide with code examples for curl, Node.js, Python, cron, and CI/CD |
| `ionhour://tools/catalog` | `tools_catalog` | `application/json` | Catalog of all tools organized by domain with one-line descriptions |
| `ionhour://guides/workflows` | `workflow_guides` | `text/markdown` | Common workflow patterns: setup monitoring, incident response, safe deployment, weekly review |

## Environment Variables

| Variable | Description |
|----------|-------------|
| `IONHOUR_API_KEY` | API key for authentication |
| `IONHOUR_BASE_URL` | MCP endpoint URL override (default: `https://mcp.ionhour.com`) |
| `IONHOUR_AUTH_URL` | Keycloak auth server URL (for `login` command) |
| `IONHOUR_REALM` | Keycloak realm name (for `login` command) |

## Troubleshooting

### Test the MCP Server

```bash
# Check authentication
npx @ionhour/mcp-server whoami

# Test the server starts
npx @ionhour/mcp-server
```

### Common Issues

**"IonHour API key is required"**
- Run `npx @ionhour/mcp-server login` to authenticate interactively
- Or set `IONHOUR_API_KEY` environment variable
- Or pass `--api-key` flag

**"Authentication failed"**
- Verify your API key is valid in the IonHour dashboard
- Check that the key hasn't been revoked
- Ensure the key has the right permission level for the tools you're calling

**"Tool not found" or permission errors**
- Read Only keys can only use view/status tools
- Write tools (create, update, delete, send) require a Read & Write key
- Delete tools require admin-level access

**Connection issues**
- Check network connectivity to `mcp.ionhour.com`
- If behind a proxy, ensure HTTPS traffic is allowed
- Try `curl -I https://mcp.ionhour.com` to verify reachability

## Security Considerations

- API keys grant access to your entire workspace. Treat them like passwords.
- Stored credentials at `~/.config/ionhour/credentials.json` have 600 file permissions (owner-only read/write).
- Use Read Only keys when write access is not needed.
- Delete tools are irreversible. AI assistants should confirm with the user before deleting resources.
- The MCP server runs locally with the permissions of the executing user. It does not expose any network ports.

## Further Reading

- [MCP Prompts and Workflow Guide](MCP_PROMPTS.md) — Detailed prompt documentation and best practices
- [IonHour Documentation](https://docs.ionhour.com)
- [MCP Specification](https://modelcontextprotocol.io)
