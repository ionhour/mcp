# Changelog

All notable changes to `@ionhour/mcp-server` will be documented in this file.

The server-side MCP API is hosted at `https://mcp.ionhour.com`. This package is a transparent stdio proxy — new tools, resources, and prompts are available immediately without a package update.

## [Unreleased]

### Added

#### Status Page Verification
- `get_status_page_preview` — the RENDERED state of a status page (overall status, every row's live status + uptimePct, active incidents, announcements, maintenances) plus its real public URL. Status pages are a client-rendered SPA, so agents previously needed a real browser to verify composition; this is the same payload the page renders, as an owner view (disabled/private pages included)

#### Read-Your-Writes & Discovery Tools (3 new tools)
- `get_check` — Full STORED configuration of a check (schedule, grace, alerting, and for outbound probes every HTTP option, assertion, threshold, and region). Complements `get_check_status` (live state); `create_check`/`update_check` now also echo this full projection instead of dropping ~13 accepted fields
- `list_regions` — The probe-region menu (id, display name, flag) plus defaults; previously the only discovery path was a validation error
- `get_alert_routing` — How alerts actually route: policies → rules (match on STATUS + optional project/check scope; severity is NOT a match dimension) → actions, the all-enabled-channels fallback, and the channel inventory

#### Workspace Limits Introspection
- `get_workspace` now returns the plan's resource limits (`maxMonitors` = shared checks+jobs pool, per-page/per-check caps named accordingly) and current usage (projects, monitors, team members), so agents know the cliff before hitting it mid-build

#### Manual Dependency Status Pinning
- `update_dependency_status` now PINS the status (`statusSource=MANUAL`): automatic monitor rollup no longer silently overwrites a manually-set status on the next check event. Pass `status: "AUTO"` to release the pin and recompute from monitors immediately

#### Slow-Cron Job Support
- `register_job`/`update_job` intervals now go up to **7 days** (was 1 hour) and grace periods up to **24 hours** (was 60s), platform-wide — hourly+, 12-hour, daily, and weekly crons with variable runtimes are now modelable. The human-interval grammar understands `"daily"`, `"weekly"`, `"every N days"`, and `"every N weeks"`. Outbound checks keep their 10–3600s probe cadence; `"daily"` on a check answers with an actionable out-of-range error

#### Fixed
- `create_status_page` now returns a public URL that actually resolves. Status-page URLs are env-shaped (production: `https://{slug}.ionhour.cc` subdomain; sit/uat: `https://status-{env}.ionhour.cc/{slug}`), matching what the dashboard shows — the old flat-base form pointed at hosts that don't serve status pages. The same fix applies to notifier links, subscriber confirm/unsubscribe links, RSS/Atom self-links, and the embeddable widget

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
- **`register_job` returns an absolute ping URL** — `pingUrl` now includes the signal host (previously a relative `/api/signals/ping/<token>` path), matching `get_job_integration_guide`.
- **Job interval floor aligned with the dashboard** — `register_job`/`update_job` accept intervals from 10s (previously 300s), matching the platform-wide 10–3600s range.
- **Dependency-anchored checks readable everywhere** — `get_check_status`, `pause_check`, `resume_check`, `get_check_integration_guide`, and `delete_check` now resolve checks anchored to a dependency (previously only `run_check_probe` and the write tools did, so a dependency health check could be probed but not read).
- **`list_status_pages` component preview is now honest** — every previewed row carries `name`, `linkType` (check/job/project/dependency), and `linkedName` (previously job- and dependency-linked rows were bare ids), and `componentsTruncated: true` marks a preview cut at 10 rows so `componentCount` can no longer silently disagree with the array length.
- **`get_dependency` counts disambiguated** — the misleading `checksCount` (which counted project checks *depending on* the dependency, not the attached monitors listed next to it) is replaced by `attachedChecksCount` (matches `dependencyChecks`) and `dependentChecksCount` (matches `serviceChecks`); `list_dependencies` renames its count to `dependentChecksCount` accordingly.
- **Status-page component docs** — `add_status_page_component` now documents that `checkId` must be project-anchored (dependency health monitors link via `dependencyId`) and that dependency-linked rows show current status only (no uptime history bar).

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
