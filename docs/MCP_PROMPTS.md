# MCP Prompts and Workflow Guide

## Overview

IonHour's MCP server includes **7 built-in prompts** — pre-built workflow templates that guide AI assistants through multi-step monitoring operations. Prompts provide structured instructions so the assistant follows best practices without you having to spell out every step.

You can also configure **project rules** in your AI tool to customize how the assistant interacts with IonHour.

## Built-in Prompts

### `diagnose_incident`

**Purpose:** Step-by-step incident investigation workflow.

**Arguments:**
- `incidentId` (required): The incident ID to diagnose

**What it does:**
1. Fetches incident details with `get_incident`
2. Gets current check status and recent signals with `get_check_status`
3. Retrieves signal history with `list_signals`
4. Checks uptime trend with `get_check_uptime`
5. Looks for dependency involvement
6. Produces a summary: what happened, when, likely root cause, and recommended action

**Example usage:**
```
Use the diagnose_incident prompt for incident 42
```

---

### `setup_monitoring`

**Purpose:** Guided workflow to set up monitoring for a new service from scratch.

**Arguments:**
- `serviceName` (required): Name of the service to monitor

**What it does:**
1. Asks which monitor type is needed: an inbound heartbeat (Job) or an outbound HTTP probe (Check)
2. Lists existing projects to avoid duplicates
3. Creates a new project if needed
4. Creates the monitor(s): `register_job` for heartbeats, `create_check` for outbound probes
5. Verifies alert channels exist, creates them if missing
6. Attaches an alert channel to the project escalation policy with `add_escalation_step`
7. Provides a summary with Job ping URLs / Check IDs and integration instructions

**Example usage:**
```
Use the setup_monitoring prompt for "payment-api"
```

---

### `deployment_checklist`

**Purpose:** Pre-deployment verification and deployment window management.

**Arguments:**
- `projectId` (required): The project ID being deployed

**What it does:**

*Pre-deploy:*
1. Lists all checks for the project
2. Checks for active incidents
3. Reports current status

*Deploy:*
4. Creates a deployment window (auto-pauses checks)
5. Confirms checks are paused

*Post-deploy:*
6. Waits for user confirmation
7. Ends the deployment window (resumes checks)
8. Verifies all checks are healthy

**Example usage:**
```
Use the deployment_checklist prompt for project 5
```

---

### `weekly_reliability_report`

**Purpose:** Generate a reliability summary across all checks.

**Arguments:**
- `daysBack` (optional, default: 7): Number of days to cover

**What it does:**
1. Gets workspace summary for current status
2. Lists all checks
3. Calculates uptime for each check (top 10)
4. Reviews incidents from the period
5. Compiles a report with:
   - Overall workspace uptime percentage
   - Best and worst performing checks
   - Incident summary (count, types, MTTR)
   - Recommendations for improving reliability

**Example usage:**
```
Use the weekly_reliability_report prompt with 30 days
```

---

### `triage_all_incidents`

**Purpose:** List and triage all active incidents.

**Arguments:** None

**What it does:**
1. Lists all active incidents
2. Fetches full details for each one
3. Assesses severity and impact
4. Presents a prioritized list
5. For each incident, asks if you want to:
   - Acknowledge it
   - Resolve it
   - Investigate further (delegates to `diagnose_incident`)
6. Provides a summary of all actions taken

**Example usage:**
```
Use the triage_all_incidents prompt
```

---

### `status_page_incident`

**Purpose:** Guided workflow to communicate an incident through status pages.

**Arguments:**
- `incidentId` (required): The incident ID to communicate about

**What it does:**
1. Fetches incident details to understand what happened
2. Lists status pages to find the right one
3. Drafts an announcement based on severity:
   - CRITICAL incidents → impact=CRITICAL, status=INVESTIGATING
   - WARNING incidents → impact=MINOR, status=INVESTIGATING
4. Creates the announcement on the status page
5. Asks if you want to post follow-up updates as the situation evolves
6. When resolved, creates a follow-up with status=RESOLVED

**Example usage:**
```
Use the status_page_incident prompt for incident 15
```

---

### `dependency_health_audit`

**Purpose:** Audit all external dependencies and assess their health impact.

**Arguments:** None

**What it does:**
1. Lists all registered dependencies
2. For each dependency with status DOWN or unknown:
   - Gets linked checks
   - Checks each linked check's current status
3. Reviews active incidents for correlation
4. Produces a health report:
   - Dependencies grouped by status (OK / DOWN / unknown)
   - Checks impacted by unhealthy dependencies
   - Recommendations for dependencies that need attention
5. Asks if you want to update any dependency statuses

**Example usage:**
```
Use the dependency_health_audit prompt
```

## Project Rules

Most AI tools support project-specific rules files that customize behavior. Add IonHour-specific guidance to ensure consistent, safe interactions.

### Rules File Locations

| AI Tool | File |
|---------|------|
| Claude Code | `CLAUDE.md` or `.claude/rules.md` |
| Cursor | `.cursorrules` |
| Windsurf | `.windsurfrules` |

### Example Rules

```markdown
# IonHour Monitoring Rules

## Before Making Changes
- Always call `get_workspace_summary` first to understand current state
- Use `find_check_by_name` to resolve check names to IDs before operations
- List existing resources before creating new ones to avoid duplicates

## Check Creation
- Use descriptive names: `{service}-{what}` (e.g., "payment-api-health", "order-processor-heartbeat")
- Default to 5-minute intervals unless the user specifies otherwise
- Always set up alert channels and escalation rules after creating checks
- Provide the ping URL and integration example after creation

## Incident Response
- Acknowledge incidents before investigating to signal awareness
- Always add a note explaining what you found during investigation
- When resolving, include a message explaining the resolution
- After resolving, verify checks return to OK status

## Deployments
- Check for active incidents before starting a deployment
- Always use deployment windows — never just pause checks manually
- Verify all checks are healthy after ending a deployment

## Destructive Operations
- Always confirm with the user before deleting any resource
- List what will be affected (e.g., "This check has 5 associated incidents that will be cleaned up")
- Never delete alert channels that have active escalation rules without warning

## Scheduling
- Avoid scheduling multiple checks at identical intervals to prevent load spikes
- For critical services, use shorter intervals (5 min)
- For background jobs, longer intervals are fine (30 min - 1 hour)
```

### Environment-Specific Rules

For teams managing multiple environments, add context about which workspace the API key connects to:

```markdown
## Environment Context
- This workspace is PRODUCTION — confirm all changes with the user
- Do not create test checks in this workspace
- Coordinate with the team before modifying shared alert channels
- All incidents should be communicated through the status page
```

For staging/development workspaces:

```markdown
## Environment Context
- This workspace is STAGING — safe to experiment
- Test alert channels before replicating to production
- Use the deployment_checklist prompt before deploying to production
```

## Best Practices

### 1. Start with Context

Before performing any operation, understand the current state:

```
What's the current status of my workspace?
→ AI calls get_workspace_summary, reports check counts by status and active incidents
```

### 2. Use Prompts for Complex Workflows

Instead of issuing individual tool calls, use prompts for multi-step operations:

```
# Instead of:
"List my projects, then create a check, then set up alerts..."

# Use:
"Use the setup_monitoring prompt for my new user-service"
```

### 3. Name Resolution

Checks can be referenced by name instead of ID:

```
"What's the uptime of the payment-health check?"
→ AI uses find_check_by_name to resolve "payment-health" to a check ID
→ Then calls get_check_uptime with the resolved ID
```

### 4. Human-Readable Intervals

When creating checks, use natural language:

```
"Create a check that runs every 15 minutes"
→ AI passes interval="every 15 minutes" to create_check (or register_job for a heartbeat)
→ Server parses to 900 seconds
```

### 5. Confirm Before Destructing

AI assistants should always confirm before:
- Deleting checks, alert channels, escalation rules, or dependencies
- Resolving incidents (the user may not realize this closes the incident)
- Modifying production escalation rules

### 6. Post-Action Verification

After write operations, verify the result:
- After `register_job` → provide the ping URL and suggest a test heartbeat
- After `create_check` → run `run_check_probe` to confirm the probe works
- After `create_deployment` → confirm monitors are paused
- After `end_deployment` → verify monitors return to OK
- After `resolve_incident` → check that no new incidents appeared

## Prompt Priority

When multiple guidance sources exist, they apply in this order (highest priority first):

1. **Direct user instructions** in the current conversation
2. **Project rules files** (CLAUDE.md, .cursorrules, etc.)
3. **Built-in prompts** when explicitly invoked
4. **Resource guides** (ionhour://guides/workflows)

## Combining Prompts

Prompts can chain naturally. For example, during an incident response:

1. Start with `triage_all_incidents` to see all active issues
2. Use `diagnose_incident` for the most critical one
3. Use `status_page_incident` to communicate to users
4. After fixing, verify with `get_workspace_summary`

Or during a release:

1. Start with `deployment_checklist` for the project
2. If issues arise after deploy, use `triage_all_incidents`
3. Generate a `weekly_reliability_report` to track the impact
