import { loadCredentials, getCredentialsFilePath } from '../credentials.js';

export function whoamiCommand(): void {
  const creds = loadCredentials();

  if (!creds) {
    process.stderr.write('Not logged in.\n');
    process.stderr.write(
      'Run `npx @ionhour/mcp-server login` to authenticate.\n',
    );
    return;
  }

  process.stderr.write('\nIonhour CLI\n');
  process.stderr.write('===========\n');
  process.stderr.write(`  Workspace:    ${creds.workspaceName}\n`);
  process.stderr.write(`  Workspace ID: ${creds.workspaceId}\n`);
  process.stderr.write(`  API Base URL: ${creds.baseUrl}\n`);
  process.stderr.write(`  API Key:      ${creds.apiKey.substring(0, 12)}...\n`);
  process.stderr.write(`  Logged in:    ${creds.createdAt}\n`);
  process.stderr.write(`  Config file:  ${getCredentialsFilePath()}\n\n`);
}
