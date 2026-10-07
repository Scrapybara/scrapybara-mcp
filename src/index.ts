#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  TextContent,
} from "@modelcontextprotocol/sdk/types.js";
import { zodToJsonSchema } from "zod-to-json-schema";
import { z } from "zod";

import { ScrapybaraClient, UbuntuInstance, Scrapybara } from "scrapybara";
import {
  anthropic,
  UBUNTU_SYSTEM_PROMPT as ANTHROPIC_UBUNTU_SYSTEM_PROMPT,
} from "scrapybara/anthropic/index.js";
import {
  openai,
  UBUNTU_SYSTEM_PROMPT as OPENAI_UBUNTU_SYSTEM_PROMPT,
} from "scrapybara/openai/index.js";
import { bashTool, computerTool, editTool } from "scrapybara/tools/index.js";

import {
  StopInstanceSchema,
  BashSchema,
  ActSchema,
  StartInstanceSchema,
  GetInstancesSchema,
  CancellationNotificationSchema,
} from "./schemas.js";

let actModel =
  process.env.ACT_MODEL === "anthropic"
    ? anthropic()
    : process.env.ACT_MODEL === "openai"
    ? openai()
    : anthropic(); // Default to Anthropic

let actSystem =
  process.env.ACT_MODEL === "anthropic"
    ? ANTHROPIC_UBUNTU_SYSTEM_PROMPT
    : process.env.ACT_MODEL === "openai"
    ? OPENAI_UBUNTU_SYSTEM_PROMPT
    : ANTHROPIC_UBUNTU_SYSTEM_PROMPT; // Default to Anthropic's prompt

let currentController: AbortController | null = null;

const server = new Server(
  {
    name: "scrapybara-mcp",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
      notifications: {},
    },
  }
);

server.setNotificationHandler(CancellationNotificationSchema, async () => {
  if (currentController) {
    currentController.abort();
    currentController = null;
  }
});

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "start_instance",
        description:
          "Start a Scrapybara Ubuntu instance. Use it as a desktop sandbox to access the web or run code. Always present the stream URL to the user afterwards so they can watch the instance in real time.",
        inputSchema: zodToJsonSchema(StartInstanceSchema),
      },
      {
        name: "get_instances",
        description:
          "Get all running Scrapybara instances. Returns each instance's id and status.",
        inputSchema: zodToJsonSchema(GetInstancesSchema),
      },
      {
        name: "stop_instance",
        description: "Stop a running Scrapybara instance.",
        inputSchema: zodToJsonSchema(StopInstanceSchema),
      },
      {
        name: "bash",
        description: "Run a bash command in a Scrapybara instance.",
        inputSchema: zodToJsonSchema(BashSchema),
      },
      {
        name: "act",
        description:
          "Take action on a Scrapybara instance through an agent. The agent can control the instance with mouse/keyboard and bash commands.",
        inputSchema: zodToJsonSchema(ActSchema),
      },
    ],
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  try {
    if (!request.params.arguments) {
      throw new Error("Arguments are required");
    }

    currentController = new AbortController();

    const client = new ScrapybaraClient({
      apiKey: process.env.SCRAPYBARA_API_KEY,
    });

    switch (request.params.name) {
      case "start_instance": {
        const instance = await client.startUbuntu();
        await instance.browser.start({
          abortSignal: currentController.signal,
        });

        if (process.env.AUTH_STATE_ID) {
          await instance.browser.authenticate(
            {
              authStateId: process.env.AUTH_STATE_ID,
            },
            { abortSignal: currentController.signal }
          );
        }

        const streamUrlResponse = await instance.getStreamUrl({
          abortSignal: currentController.signal,
        });

        const streamUrl = streamUrlResponse.streamUrl;
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({ ...instance, streamUrl }, null, 2),
            } as TextContent,
          ],
        };
      }

      case "get_instances": {
        const instances = await client.getInstances({
          abortSignal: currentController.signal,
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(instances, null, 2),
            } as TextContent,
          ],
        };
      }

      case "stop_instance": {
        const args = StopInstanceSchema.parse(request.params.arguments);
        const instance = await client.get(args.instance_id, {
          abortSignal: currentController.signal,
        });

        const response = await instance.stop({
          abortSignal: currentController.signal,
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(response, null, 2),
            } as TextContent,
          ],
        };
      }

      case "bash": {
        const args = BashSchema.parse(request.params.arguments);
        const instance = await client.get(args.instance_id, {
          abortSignal: currentController.signal,
        });

        if ("bash" in instance) {
          const response = await instance.bash(
            { command: args.command },
            { abortSignal: currentController.signal }
          );

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(response, null, 2),
              } as TextContent,
            ],
          };
        } else {
          throw new Error("Instance does not support bash commands");
        }
      }

      case "act": {
        const args = ActSchema.parse(request.params.arguments);
        const instance = await client.get(args.instance_id, {
          abortSignal: currentController.signal,
        });

        const tools: Scrapybara.Tool[] = [computerTool(instance)];

        if (instance instanceof UbuntuInstance) {
          tools.push(bashTool(instance));
          tools.push(editTool(instance));
        }

        const actResponse = await client.act({
          model: actModel,
          tools,
          system: actSystem,
          prompt: args.prompt,
          schema: args.schema,
          requestOptions: {
            abortSignal: currentController.signal,
          },
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                { text: actResponse.text, output: actResponse.output },
                null,
                2
              ),
            } as TextContent,
          ],
        };
      }

      default:
        throw new Error(`Unknown tool: ${request.params.name}`);
    }
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Invalid input: ${JSON.stringify(error.errors)}`);
    }
    if (error instanceof Error && error.name === "AbortError") {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              { status: "Operation was cancelled." },
              null,
              2
            ),
          } as TextContent,
        ],
      };
    }
    throw error;
  }
});

async function runServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

runServer().catch((error) => {
  const errorMsg = error instanceof Error ? error.message : String(error);
  console.error(errorMsg);
});
