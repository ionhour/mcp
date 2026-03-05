import { createInterface } from 'node:readline';
import { hostname } from 'node:os';
import { saveCredentials } from '../credentials.js';

interface DeviceAuthResponse {
  device_code: string;
  user_code: string;
  verification_uri: string;
  verification_uri_complete: string;
  expires_in: number;
  interval: number;
}

interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
}

interface TokenErrorResponse {
  error: string;
  error_description?: string;
}

interface Workspace {
  id: number;
  name: string;
  slug?: string;
}

interface LoginOptions {
  authUrl: string;
  realm: string;
  clientId: string;
  baseUrl: string;
}

function getDefaults(): LoginOptions {
  return {
    authUrl: process.env['IONHOUR_AUTH_URL'] || 'https://kc.ionhour.com',
    realm: process.env['IONHOUR_REALM'] || 'ionhour-production',
    clientId: process.env['IONHOUR_CLI_CLIENT_ID'] || 'ionhour-cli',
    baseUrl: process.env['IONHOUR_BASE_URL'] || 'https://api.ionhour.com',
  };
}

async function initiateDeviceFlow(
  authUrl: string,
  realm: string,
  clientId: string
): Promise<DeviceAuthResponse> {
  const url = `${authUrl}/realms/${realm}/protocol/openid-connect/auth/device`;
  const body = new URLSearchParams({ client_id: clientId, scope: 'openid' });

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Device authorization failed (${res.status}): ${text}`);
  }

  return (await res.json()) as DeviceAuthResponse;
}

async function pollForToken(
  authUrl: string,
  realm: string,
  clientId: string,
  deviceCode: string,
  interval: number,
  expiresIn: number
): Promise<TokenResponse> {
  const url = `${authUrl}/realms/${realm}/protocol/openid-connect/token`;
  const deadline = Date.now() + expiresIn * 1000;

  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, interval * 1000));

    const body = new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
      client_id: clientId,
      device_code: deviceCode,
    });

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
    });

    if (res.ok) {
      return (await res.json()) as TokenResponse;
    }

    const err = (await res.json()) as TokenErrorResponse;

    if (err.error === 'authorization_pending') {
      continue;
    }
    if (err.error === 'slow_down') {
      interval += 1;
      continue;
    }
    if (err.error === 'expired_token') {
      throw new Error('Device code expired. Please run login again.');
    }

    throw new Error(
      `Token exchange failed: ${err.error} — ${err.error_description || ''}`
    );
  }

  throw new Error('Device code expired. Please run login again.');
}

async function fetchWorkspaces(
  baseUrl: string,
  accessToken: string
): Promise<Workspace[]> {
  const res = await fetch(`${baseUrl}/api/workspaces/mine`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to fetch workspaces (${res.status}): ${text}`);
  }

  return (await res.json()) as Workspace[];
}

async function createApiKey(
  baseUrl: string,
  accessToken: string,
  workspaceId: number,
  keyName: string
): Promise<{ key: string }> {
  const res = await fetch(
    `${baseUrl}/api/workspaces/${workspaceId}/api-keys`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: keyName,
        permissionLevel: 'read_write',
      }),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Failed to create API key (${res.status}): ${text}`);
  }

  return (await res.json()) as { key: string };
}

function promptUser(question: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stderr });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

export async function loginCommand(): Promise<void> {
  const opts = getDefaults();

  process.stderr.write('\nIonHour CLI Login\n');
  process.stderr.write('=================\n\n');

  // Step 1: Initiate device flow
  process.stderr.write('Requesting device code...\n');
  let deviceAuth: DeviceAuthResponse;
  try {
    deviceAuth = await initiateDeviceFlow(opts.authUrl, opts.realm, opts.clientId);
  } catch (err) {
    process.stderr.write(
      `\nFailed to connect to auth server at ${opts.authUrl}\n`
    );
    process.stderr.write(
      'Set IONHOUR_AUTH_URL if your auth server is at a different address.\n\n'
    );
    throw err;
  }

  // Step 2: Display code and URL
  process.stderr.write('\nOpen this URL in your browser:\n');
  process.stderr.write(`  ${deviceAuth.verification_uri_complete}\n\n`);
  process.stderr.write(`Or go to ${deviceAuth.verification_uri} and enter code:\n`);
  process.stderr.write(`  ${deviceAuth.user_code}\n\n`);
  process.stderr.write('Waiting for approval...\n');

  // Step 3: Poll for token
  const token = await pollForToken(
    opts.authUrl,
    opts.realm,
    opts.clientId,
    deviceAuth.device_code,
    deviceAuth.interval || 5,
    deviceAuth.expires_in
  );

  process.stderr.write('Authenticated successfully!\n\n');

  // Step 4: Fetch workspaces
  const workspaces = await fetchWorkspaces(opts.baseUrl, token.access_token);

  if (workspaces.length === 0) {
    throw new Error(
      'No workspaces found. Create a workspace at https://app.ionhour.com first.'
    );
  }

  let selectedWorkspace: Workspace;

  if (workspaces.length === 1) {
    selectedWorkspace = workspaces[0];
    process.stderr.write(
      `Using workspace: ${selectedWorkspace.name}\n\n`
    );
  } else {
    process.stderr.write('Select a workspace:\n');
    for (let i = 0; i < workspaces.length; i++) {
      process.stderr.write(`  [${i + 1}] ${workspaces[i].name}\n`);
    }
    process.stderr.write('\n');

    const choice = await promptUser('Enter number: ');
    const idx = parseInt(choice, 10) - 1;

    if (isNaN(idx) || idx < 0 || idx >= workspaces.length) {
      throw new Error('Invalid selection.');
    }

    selectedWorkspace = workspaces[idx];
  }

  // Step 5: Create API key
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const keyName = `CLI (${hostname()}, ${dateStr})`;

  process.stderr.write(`Creating API key "${keyName}"...\n`);

  const { key } = await createApiKey(
    opts.baseUrl,
    token.access_token,
    selectedWorkspace.id,
    keyName
  );

  // Step 6: Save credentials
  saveCredentials({
    apiKey: key,
    baseUrl: opts.baseUrl,
    workspaceId: selectedWorkspace.id,
    workspaceName: selectedWorkspace.name,
    createdAt: now.toISOString(),
  });

  process.stderr.write('\nLogin successful!\n');
  process.stderr.write(`  Workspace: ${selectedWorkspace.name}\n`);
  process.stderr.write(`  API key stored securely.\n\n`);
  process.stderr.write(
    'You can now run the MCP server without setting IONHOUR_API_KEY.\n'
  );
}
