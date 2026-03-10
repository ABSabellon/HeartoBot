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
| `/location update <type> <location>` | Update a resource location (author or mod only) |

Locations persist to `src/data/locations.json` and survive bot restarts. They reset automatically at the configured reset hour (default: 7:00 AM) based on the configured timezone.

### Birthday Commands

| Command | Description |
|---------|-------------|
| `/birthday set <month> <day>` | Set your birthday |
| `/birthday list` | View all registered birthdays |

Birthdays are stored in `src/data/birthdays.json`. The bot automatically sends a greeting at the configured greet hour (default: 9:00 AM) in the configured timezone to the birthday channel(s).

### Admin Commands (Requires Manage Guild permission)

| Command | Description |
|---------|-------------|
| `/config resource list` | List all configured resource types |
| `/config resource add <name> <value>` | Add a new resource type |
| `/config resource remove <value>` | Remove a resource type |
| `/config channel list <command>` | List allowed channels for a command |
| `/config channel add <command> <channel>` | Restrict a command to a channel |
| `/config channel remove <command> <channel>` | Remove a channel restriction |

## Configuration

### Data Files

| File | Purpose |
|------|---------|
| `src/data/settings.json` | Bot settings (timezone, reset/greet hours) |
| `src/data/commands.json` | Command metadata (enabled, permissions, descriptions) |
| `src/data/channels.json` | Channel restrictions per command |
| `src/data/resourceTypes.json` | Resource types for `/location` |
| `src/data/locations.json` | Daily location data (auto-resets) |
| `src/data/birthdays.json` | Registered user birthdays |

### Settings (`src/data/settings.json`)

| Setting | Default | Description |
|---------|---------|-------------|
| `timezone.name` | `Asia/Manila` | Timezone identifier |
| `timezone.label` | `Philippine Time (PHT)` | Display label used in embeds |
| `timezone.utcOffset` | `8` | UTC offset in hours |
| `locationResetHour` | `7` | Hour (0-23) when daily locations reset |
| `birthdayGreetHour` | `9` | Hour (0-23) when birthday greetings are sent |

## Setup

1. Copy `.env.example` to `.env` and fill in your bot token, client ID, and guild ID
2. Install dependencies: `npm install`
3. Deploy slash commands: `node deploy-commands.js`
4. Start the bot: `node index.js`
