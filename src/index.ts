import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { VERSION } from './version.js';
import { loadCredentials } from './credentials.js';

export interface IonHourMcpConfig {
  apiKey: string;
  baseUrl: string;
}

/**
 * Resolve configuration from explicit overrides, environment variables,
 * stored credentials (~/.config/ionhour/credentials.json), or defaults.
 * Throws if no API key is available from any source.
 */
export function resolveConfig(
  overrides?: Partial<IonHourMcpConfig>
): IonHourMcpConfig {
  const creds = loadCredentials();

  const apiKey =
    overrides?.apiKey || process.env['IONHOUR_API_KEY'] || creds?.apiKey;
  if (!apiKey) {
    throw new Error(
      'IonHour API key is required.\n' +
        '  Run: npx @ionhour/mcp-server login\n' +
        '  Or set IONHOUR_API_KEY environment variable\n' +
        '  Or pass --api-key flag'
    );
  }
  return {
    apiKey,
    baseUrl:
      overrides?.baseUrl ||
      process.env['IONHOUR_BASE_URL'] ||
      creds?.baseUrl ||
      'https://api.ionhour.com',
  };
}

/**
 * Create an MCP Client connected to the remote IonHour API endpoint.
 */
async function createRemoteClient(config: IonHourMcpConfig): Promise<Client> {
  const transport = new StreamableHTTPClientTransport(
    new URL(`${config.baseUrl}/api/mcp`),
    {
      requestInit: {
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
        },
      },
    }
  );

  const client = new Client({ name: 'ionhour-mcp-proxy', version: VERSION });

  await client.connect(transport);
  return client;
}

/**
 * Start the stdio-to-HTTP MCP proxy server.
 *
 * 1. Connects to the remote IonHour MCP endpoint as a client
 * 2. Exposes an MCP server over stdio
 * 3. Proxies all tool/resource/prompt requests to the remote endpoint
 */
export async function startProxyServer(
  config: IonHourMcpConfig
): Promise<void> {
  let remoteClient: Client;

  try {
    remoteClient = await createRemoteClient(config);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(
      `Failed to connect to IonHour API at ${config.baseUrl}/api/mcp: ${message}\n`
    );
    process.exit(1);
  }

  const server = new Server(
    { name: 'ionhour', version: VERSION },
    {
      capabilities: {
        tools: {},
        resources: {},
        prompts: {},
      },
    }
  );

  // Proxy tools/list
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    const result = await remoteClient.listTools();
    return { tools: result.tools };
  });

  // Proxy tools/call
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const result = await remoteClient.callTool({
      name: request.params.name,
      arguments: request.params.arguments,
    });
    return result;
  });

  // Proxy resources/list
  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    try {
      const result = await remoteClient.listResources();
      return { resources: result.resources };
    } catch {
      return { resources: [] };
    }
  });

  // Proxy resources/read
  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const result = await remoteClient.readResource({
      uri: request.params.uri,
    });
    return result;
  });

  // Proxy prompts/list
  server.setRequestHandler(ListPromptsRequestSchema, async () => {
    try {
      const result = await remoteClient.listPrompts();
      return { prompts: result.prompts };
    } catch {
      return { prompts: [] };
    }
  });

  // Proxy prompts/get
  server.setRequestHandler(GetPromptRequestSchema, async (request) => {
    const result = await remoteClient.getPrompt({
      name: request.params.name,
      arguments: request.params.arguments,
    });
    return result;
  });

  // Connect local server to stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);

  // Log to stderr so stdout remains clean for MCP JSON-RPC protocol
  process.stderr.write('IonHour MCP server started (stdio proxy mode)\n');
}
