import { deleteCredentials, getCredentialsFilePath } from '../credentials.js';

export function logoutCommand(): void {
  const deleted = deleteCredentials();

  if (deleted) {
    process.stderr.write('Logged out. Credentials removed.\n');
  } else {
    process.stderr.write(
      `No credentials found at ${getCredentialsFilePath()}\n`
    );
  }
}
