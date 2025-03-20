<div id="toc" align="center">
  <ul style="list-style: none">
    <summary>
      <h1><img src="images/wow.gif" alt="Scrapybara" width="24"> Scrapybara MCP <img src="images/wow.gif" alt="Scrapybara" width="24"></h1>
    </summary>
  </ul>
</div>

<p align="center">
  <a href="https://github.com/scrapybara/scrapybara-playground/blob/main/license"><img alt="MIT License" src="https://img.shields.io/badge/license-MIT-blue" /></a>
  <a href="https://discord.gg/s4bPUVFXqA"><img alt="Discord" src="https://img.shields.io/badge/Discord-Join%20the%20community-6D1CCF.svg?logo=discord" /></a>
  <a href="https://x.com/scrapybara"><img alt="X" src="https://img.shields.io/badge/Twitter-Follow%20us-6D1CCF.svg?logo=X" /></a>

A Model Context Protocol server for [Scrapybara](https://scrapybara.com). This server enables MCP clients such as [Claude Desktop](https://claude.ai/download), [Cursor](https://www.cursor.com/), and [Windsurf](https://codeium.com/windsurf) to interact with virtual Ubuntu desktops and take actions such as browsing the web, running code, and more.

<a href="https://glama.ai/mcp/servers/g1ig1ibrsc">
  <img width="380" height="200" src="https://glama.ai/mcp/servers/g1ig1ibrsc/badge" alt="Scrapybara MCP server" />
</a>

## Prerequisites

- Node.js 18+
- pnpm
- Scrapybara API key (get one at [scrapybara.com](https://scrapybara.com))

## Installation

1. Clone the repository:

```bash
git clone https://github.com/scrapybara/scrapybara-mcp.git
cd scrapybara-mcp
```

2. Install dependencies:

```bash
pnpm install
```

3. Build the project:

```bash
pnpm build
```

4. Add the following to your MCP client config:

```json
{
  "mcpServers": {
    "scrapybara-mcp": {
      "command": "node",
      "args": ["path/to/scrapybara-mcp/dist/index.js"],
      "env": {
        "SCRAPYBARA_API_KEY": "<YOUR_SCRAPYBARA_API_KEY>",
        "ACT_MODEL": "<YOUR_ACT_MODEL>", // "anthropic" or "openai"
        "AUTH_STATE_ID": "<YOUR_AUTH_STATE_ID>" // Optional, for authenticating the browser
      }
    }
  }
}
```

5. Restart your MCP client and you're good to go!

## Tools

- **start_instance** - Start a Scrapybara Ubuntu instance. Use it as a desktop sandbox to access the web or run code. Always present the stream URL to the user afterwards so they can watch the instance in real time.
- **get_instances** - Get all running Scrapybara instances.
- **stop_instance** - Stop a running Scrapybara instance.
- **bash** - Run a bash command in a Scrapybara instance.
- **act** - Take action on a Scrapybara instance through an agent. The agent can control the instance with mouse/keyboard and bash commands.

## Contributing

Scrapybara MCP is a community-driven project. Whether you're submitting an idea, fixing a typo, adding a new tool, or improving an existing one, your contributions are greatly appreciated!

Before contributing, read through the existing issues and pull requests to see if someone else is already working on something similar. That way you can avoid duplicating efforts.

If there are more tools or features you'd like to see, feel free to suggest them on the [issues page](https://github.com/scrapybara/scrapybara-mcp/issues).