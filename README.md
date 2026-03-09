# HeartoBot

A Discord bot built with discord.js.

## Commands

### General Commands

| Command | Description |
|---------|-------------|
| `/help` | View available commands and their usage |
| `/help <command>` | Get detailed info about a specific command |

### Town Commands

| Command | Description |
|---------|-------------|
| `/town <id> <pass> <hours>` | Post a town with ID, password, and availability (1-24 hours). Message auto-updates to "Expired" when time runs out. |

### Location Commands

| Command | Description |
|---------|-------------|
| `/location add <type> <location>` | Add a new resource location for today |
| `/location list` | View all locations added today |
| `/location update <type> <location>` | Update a resource location you added |

### Admin Commands (Requires Manage Guild permission)

| Command | Description |
|---------|-------------|
| `/config resource list` | List all configured resource types |
| `/config resource add <name> <value>` | Add a new resource type |
| `/config resource remove <value>` | Remove a resource type |

## Configuration

Commands can be configured in `src/data/commands.json`:
- `enabled` - Enable/disable commands
- `permissions` - Set required permissions (`everyone` or `ManageGuild`)
- `channelId` - Restrict command to specific channel