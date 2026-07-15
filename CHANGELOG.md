# Changelog

All notable changes to `@ionhour/mcp-server` will be documented in this file.

The server-side MCP API is hosted at `https://mcp.ionhour.com`. This package is a transparent stdio proxy — new tools, resources, and prompts are available immediately without a package update.

## [Unreleased]

### Added

#### Delete Tools (4 new tools)
- `delete_check` — Soft-delete a monitoring check (cleans up signals and incidents)
- `delete_alert_channel` — Delete a notification channel
- `delete_escalation_rule` — Delete an escalation rule
- `delete_dependency` — Soft-delete an external dependency

#### Resources (2 new, 5 total)
- `ionhour://tools/catalog` — JSON catalog of all tools organized by domain
- `ionhour://guides/workflows` — Markdown guide with common workflow patterns (setup monitoring, incident response, safe deployment, weekly review, safety guidelines)

#### Prompts (2 new, 7 total)
- `status_page_incident` — Guided workflow to communicate incidents through status pages
- `dependency_health_audit` — Audit all dependencies and assess health impact on checks

#### Incident Lifecycle Tools (3 new tools)
- `update_incident` — Edit an incident's title and/or summary (summary is rich text, sanitized server-side)
- `reopen_incident` — Reopen a resolved incident, moving it back to active
- `set_incident_severity` — Change an incident's severity (P1–P4)

#### Incident Communications Tools (3 new tools)
- `publish_incident_to_status_page` — Publish an incident to a status page as a public, incident-linked announcement (idempotent — returns the existing announcement if already published)
- `create_incident_update` — Post a stakeholder update to an incident (internal record; does not publish to a status page on its own)
- `publish_incident_update` — Publish an existing stakeholder update to the workspace status page

#### Human-Readable Schedule Input
- `register_job` and `create_check` accept an `interval` string field (e.g., "every 5 minutes", "hourly", "every 30 min") as an alternative to `intervalSeconds`

### Changed

- **Guide & prompt refresh** — the workflow guides and the `setup_monitoring`, `diagnose_incident`, `deployment_checklist`, and `weekly_reliability_report` prompts now distinguish inbound heartbeat monitors (Jobs) from outbound HTTP probes (Checks), branching on monitor type and iterating both check and job tools where relevant.

### Deprecated

- **`register_check` is now a tombstone (behavior change).** It no longer creates anything — calling it returns a structured error. It previously created a **Job** (inbound heartbeat monitor), which caused confusion. Migrate to `register_job` for heartbeat monitors or `create_check` for outbound HTTP probes.

## [0.1.10] - 2025-05-28

### Added
- Status page tools: `list_status_pages`, `create_status_page`, `update_status_page`, `create_announcement`
- Alert channel tools: `list_alert_channels`, `create_alert_channel`, `update_alert_channel`
- Escalation rule tools: `list_escalation_rules`, `create_escalation_rule`, `update_escalation_rule`

## [0.1.9] - 2025-05-20

### Added
- Deployment tools: `create_deployment`, `end_deployment`, `list_deployments`
- Dependency tools: `list_dependencies`, `get_dependency`, `create_dependency`, `update_dependency_status`

## [0.1.8] - 2025-05-15

### Added
- Incident tools: `list_incidents`, `search_incidents`, `get_incident`, `get_incident_timeline`, `create_incident`, `acknowledge_incident`, `resolve_incident`, `add_incident_note`

## [0.1.7] - 2025-05-10

### Added
- Signal tools: `send_heartbeat`, `send_failure_signal`, `list_signals`
- Check tools: `get_check_uptime`, `find_check_by_name`, `list_checks_by_status`

## [0.1.6] - 2025-05-05

### Added
- Check tools: `register_check`, `list_checks`, `get_check_status`, `pause_check`, `resume_check`
- Project tools: `list_projects`, `create_project`, `update_project`

## [0.1.5] - 2025-04-28

### Added
- MCP resources: `ionhour://enums`, `ionhour://checks/schema`, `ionhour://help/ping-formats`
- MCP prompts: `diagnose_incident`, `setup_monitoring`, `deployment_checklist`, `weekly_reliability_report`, `triage_all_incidents`

## [0.1.4] - 2025-04-20

### Added
- Workspace tools: `get_workspace`, `whoami`, `get_workspace_summary`, `get_workspace_reliability`, `list_team_members`, `send_invitation`

## [0.1.0] - 2025-04-01

### Added
- Initial release
- stdio-to-HTTP proxy for IonHour MCP API
- CLI commands: `login` (device auth flow), `logout`, `whoami`
- Smithery marketplace support
