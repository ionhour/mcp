import { readFileSync, writeFileSync, mkdirSync, unlinkSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';

export interface StoredCredentials {
  apiKey: string;
  baseUrl: string;
  workspaceId: number;
  workspaceName: string;
  createdAt: string;
}

function getConfigDir(): string {
  const xdg = process.env['XDG_CONFIG_HOME'];
  const base = xdg || join(homedir(), '.config');
  return join(base, 'ionhour');
}

function getCredentialsPath(): string {
  return join(getConfigDir(), 'credentials.json');
}

export function loadCredentials(): StoredCredentials | null {
  const path = getCredentialsPath();
  if (!existsSync(path)) return null;
  try {
    const raw = readFileSync(path, 'utf-8');
    return JSON.parse(raw) as StoredCredentials;
  } catch {
    return null;
  }
}

export function saveCredentials(creds: StoredCredentials): void {
  const dir = getConfigDir();
  mkdirSync(dir, { recursive: true });
  writeFileSync(getCredentialsPath(), JSON.stringify(creds, null, 2) + '\n', {
    mode: 0o600,
  });
}

export function deleteCredentials(): boolean {
  const path = getCredentialsPath();
  if (!existsSync(path)) return false;
  unlinkSync(path);
  return true;
}

export function getCredentialsFilePath(): string {
  return getCredentialsPath();
}
