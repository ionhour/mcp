import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  existsSync,
} from 'node:fs';
import { homedir, platform } from 'node:os';
import { join } from 'node:path';
import { execSync } from 'node:child_process';
import * as p from '@clack/prompts';
import { loadCredentials } from '../credentials.js';
import { loginCommand } from './login.js';
import { VERSION } from '../version.js';

interface EditorOption {
  value: string;
  label: string;
  hint?: string;
}

interface EditorConfig {
  /** Check if this editor is installed */
  detect: () => boolean;
  /** Install the MCP server config */
  install: (apiKey: string) => void;
}

// ─── Stdio config: used by Cursor, Claude Desktop, VS Code ───

function stdioServerEntry(): Record<string, unknown> {
  return {
    command: 'npx',
    args: ['-y', '@ionhour/mcp-server'],
  };
}

// ─── JSON config helpers ───

function readJsonFile(path: string): Record<string, unknown> {
  if (!existsSync(path)) return {};
  try {
    return JSON.parse(readFileSync(path, 'utf-8')) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function writeJsonFile(path: string, data: Record<string, unknown>): void {
  const dir = join(path, '..');
  mkdirSync(dir, { recursive: true });
  writeFileSync(path, JSON.stringify(data, null, 2) + '\n', 'utf-8');
}

function mergeServerConfig(
  filePath: string,
  serversKey: string,
  serverName: string,
  entry: Record<string, unknown>
): void {
  const config = readJsonFile(filePath);
  const servers = (config[serversKey] as Record<string, unknown>) || {};
  servers[serverName] = entry;
  config[serversKey] = servers;
  writeJsonFile(filePath, config);
}

// ─── Editor detection & installation ───

const home = homedir();
const os = platform();

function claudeDesktopConfigPath(): string {
  if (os === 'darwin') {
    return join(
      home,
      'Library',
      'Application Support',
      'Claude',
      'claude_desktop_config.json'
    );
  }
  if (os === 'win32') {
    return join(
      process.env['APPDATA'] || join(home, 'AppData', 'Roaming'),
      'Claude',
      'claude_desktop_config.json'
    );
  }
  // Linux
  return join(
    process.env['XDG_CONFIG_HOME'] || join(home, '.config'),
    'Claude',
    'claude_desktop_config.json'
  );
}

function commandExists(cmd: string): boolean {
  try {
    execSync(`which ${cmd}`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

const EDITORS: Record<string, EditorConfig> = {
  cursor: {
    detect: () => existsSync(join(home, '.cursor')),
    install: () => {
      const configPath = join(home, '.cursor', 'mcp.json');
      mergeServerConfig(configPath, 'mcpServers', 'ionhour', stdioServerEntry());
      p.log.info(`  Written to ${configPath}`);
    },
  },

  'claude-desktop': {
    detect: () => {
      if (os === 'darwin') {
        return existsSync(
          join(home, 'Library', 'Application Support', 'Claude')
        );
      }
      if (os === 'win32') {
        return existsSync(
          join(
            process.env['APPDATA'] || join(home, 'AppData', 'Roaming'),
            'Claude'
          )
        );
      }
      return false;
    },
    install: () => {
      const configPath = claudeDesktopConfigPath();
      mergeServerConfig(
        configPath,
        'mcpServers',
        'ionhour',
        stdioServerEntry()
      );
      p.log.info(`  Written to ${configPath}`);
    },
  },

  'claude-code': {
    detect: () => commandExists('claude'),
    install: (apiKey: string) => {
      try {
        execSync(
          `claude mcp add ionhour -- npx -y @ionhour/mcp-server`,
          { stdio: 'ignore' }
        );
        p.log.info(`  Ran: claude mcp add ionhour -- npx -y @ionhour/mcp-server`);
      } catch {
        // Fallback: write to ~/.claude.json
        const configPath = join(home, '.claude.json');
        const config = readJsonFile(configPath);
        const mcpServers = (config['mcpServers'] as Record<string, unknown>) || {};
        mcpServers['ionhour'] = {
          command: 'npx',
          args: ['-y', '@ionhour/mcp-server'],
        };
        config['mcpServers'] = mcpServers;
        writeJsonFile(configPath, config);
        p.log.info(`  Written to ${configPath}`);
      }
    },
  },

  vscode: {
    detect: () => {
      if (os === 'darwin') {
        return existsSync(
          join(home, 'Library', 'Application Support', 'Code')
        );
      }
      if (os === 'win32') {
        return existsSync(
          join(
            process.env['APPDATA'] || join(home, 'AppData', 'Roaming'),
            'Code'
          )
        );
      }
      return (
        existsSync(join(home, '.vscode')) ||
        existsSync(join(home, '.config', 'Code'))
      );
    },
    install: () => {
      // VS Code uses .vscode/mcp.json in workspace or user settings
      // Use user-level settings for global availability
      let settingsDir: string;
      if (os === 'darwin') {
        settingsDir = join(
          home,
          'Library',
          'Application Support',
          'Code',
          'User'
        );
      } else if (os === 'win32') {
        settingsDir = join(
          process.env['APPDATA'] || join(home, 'AppData', 'Roaming'),
          'Code',
          'User'
        );
      } else {
        settingsDir = join(
          process.env['XDG_CONFIG_HOME'] || join(home, '.config'),
          'Code',
          'User'
        );
      }

      const settingsPath = join(settingsDir, 'settings.json');
      const config = readJsonFile(settingsPath);

      const mcpServers = (config['mcp'] as Record<string, unknown>) || {};
      const servers =
        (mcpServers['servers'] as Record<string, unknown>) || {};
      servers['ionhour'] = {
        type: 'stdio',
        command: 'npx',
        args: ['-y', '@ionhour/mcp-server'],
      };
      mcpServers['servers'] = servers;
      config['mcp'] = mcpServers;

      writeJsonFile(settingsPath, config);
      p.log.info(`  Written to ${settingsPath}`);
    },
  },

  zed: {
    detect: () => existsSync(join(home, '.config', 'zed')),
    install: () => {
      const settingsPath = join(home, '.config', 'zed', 'settings.json');
      const config = readJsonFile(settingsPath);

      const contextServers =
        (config['context_servers'] as Record<string, unknown>) || {};
      contextServers['ionhour'] = {
        command: {
          path: 'npx',
          args: ['-y', '@ionhour/mcp-server'],
        },
        settings: {},
      };
      config['context_servers'] = contextServers;

      writeJsonFile(settingsPath, config);
      p.log.info(`  Written to ${settingsPath}`);
    },
  },

  windsurf: {
    detect: () =>
      existsSync(join(home, '.codeium')) ||
      existsSync(join(home, '.windsurf')),
    install: () => {
      const configPath = join(home, '.codeium', 'windsurf', 'mcp_config.json');
      mergeServerConfig(configPath, 'mcpServers', 'ionhour', stdioServerEntry());
      p.log.info(`  Written to ${configPath}`);
    },
  },
};

// ─── Main setup command ───

export async function setupCommand(): Promise<void> {
  p.intro(`IonHour MCP Setup v${VERSION}`);

  // Step 1: Ensure credentials exist
  let creds = loadCredentials();
  if (!creds) {
    p.log.warn('Not logged in yet.');
    const shouldLogin = await p.confirm({
      message: 'Would you like to log in now?',
      initialValue: true,
    });

    if (p.isCancel(shouldLogin) || !shouldLogin) {
      p.cancel('Setup cancelled. Run `npx @ionhour/mcp-server login` first.');
      process.exit(0);
    }

    await loginCommand();
    creds = loadCredentials();

    if (!creds) {
      p.cancel('Login failed. Please try again.');
      process.exit(1);
    }
  }

  p.log.success(`Logged in to workspace: ${creds.workspaceName}`);

  // Step 2: Build options list with detection hints
  const options: EditorOption[] = [];
  for (const [key, editor] of Object.entries(EDITORS)) {
    const installed = editor.detect();
    const labels: Record<string, string> = {
      cursor: 'Cursor',
      'claude-desktop': 'Claude Desktop',
      'claude-code': 'Claude Code',
      vscode: 'Visual Studio Code',
      zed: 'Zed',
      windsurf: 'Windsurf',
    };

    options.push({
      value: key,
      label: labels[key] || key,
      hint: installed ? 'detected' : 'not detected',
    });
  }

  // Step 3: Multi-select editor picker
  const selected = await p.multiselect({
    message: 'Select editors to install MCP server',
    options,
    required: true,
  });

  if (p.isCancel(selected)) {
    p.cancel('Setup cancelled.');
    process.exit(0);
  }

  // Step 4: Install for each selected editor
  const s = p.spinner();
  const results: { editor: string; success: boolean; error?: string }[] = [];

  for (const editorKey of selected) {
    const editor = EDITORS[editorKey];
    const label =
      options.find((o) => o.value === editorKey)?.label || editorKey;

    s.start(`Configuring ${label}...`);

    try {
      editor.install(creds.apiKey);
      results.push({ editor: label, success: true });
      s.stop(`${label} configured`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      results.push({ editor: label, success: false, error: msg });
      s.stop(`${label} failed: ${msg}`);
    }
  }

  // Step 5: Summary
  const succeeded = results.filter((r) => r.success);
  const failed = results.filter((r) => !r.success);

  if (succeeded.length > 0) {
    p.log.success(
      `Installed in: ${succeeded.map((r) => r.editor).join(', ')}`
    );
  }
  if (failed.length > 0) {
    p.log.error(
      `Failed for: ${failed.map((r) => `${r.editor} (${r.error})`).join(', ')}`
    );
  }

  p.outro('Restart your editor(s) to connect to IonHour.');
}
