const { Client, GatewayIntentBits, Collection } = require('discord.js');
const { loadCommands, registerCommands } = require('./src/handlers/commandHandler');
const { TOKEN } = require('./src/config');

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]
});

client.commands = new Collection();

client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}`);
    loadCommands(client);
    await registerCommands(client);
});

// Load event handlers
require('./src/events/messageCreate')(client);
require('./src/events/interactionCreate')(client);

client.login(TOKEN);
