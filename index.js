const { Client, GatewayIntentBits, Collection } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { loadCommands, registerCommands } = require('./src/handlers/commandHandler');
const { TOKEN } = require('./src/config');
const { loadSettings, getNow } = require('./src/utils/settings');

const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages]
});

client.commands = new Collection();

// Birthday greeting scheduler - checks every minute, greets at configured hour
function startBirthdayScheduler() {
    const BIRTHDAYS_PATH = path.join(__dirname, 'src/data/birthdays.json');
    const CHANNELS_PATH = path.join(__dirname, 'src/data/channels.json');
    let lastGreetedDate = null;

    setInterval(async () => {
        const settings = loadSettings();
        const now = getNow();

        const hour = now.getHours();
        const minute = now.getMinutes();
        const todayStr = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;

        // Trigger at configured hour, only once per day
        if (hour !== settings.birthdayGreetHour || minute !== 0 || lastGreetedDate === todayStr) return;
        lastGreetedDate = todayStr;

        let birthdays;
        try {
            birthdays = JSON.parse(fs.readFileSync(BIRTHDAYS_PATH, 'utf8'));
        } catch {
            return;
        }

        const todayBirthdays = birthdays.filter(b => b.month === now.getMonth() + 1 && b.day === now.getDate());
        if (todayBirthdays.length === 0) return;

        // Get birthday channel(s), fall back to first available text channel
        let channelIds = [];
        try {
            const channels = JSON.parse(fs.readFileSync(CHANNELS_PATH, 'utf8'));
            channelIds = channels['birthday'] || [];
        } catch { /* ignore */ }

        const mentions = todayBirthdays.map(b => `<@${b.userId}>`).join(', ');
        const message = `🎂🎉 Happy Birthday ${mentions}! Have an awesome day!`;

        if (channelIds.length > 0) {
            for (const id of channelIds) {
                try {
                    const channel = await client.channels.fetch(id);
                    if (channel) await channel.send(message);
                } catch (err) {
                    console.error(`Failed to send birthday greeting to channel ${id}:`, err);
                }
            }
        } else {
            // Fallback: send to first text channel the bot can access
            const guild = client.guilds.cache.first();
            if (guild) {
                const channel = guild.channels.cache.find(ch => ch.isTextBased() && ch.permissionsFor(guild.members.me)?.has('SendMessages'));
                if (channel) await channel.send(message);
            }
        }
    }, 60_000); // Check every minute
}

// Location reset scheduler - clears locations at configured reset hour
function startLocationResetScheduler() {
    const locationCommand = client.commands.get('location');
    if (!locationCommand || !locationCommand.resetIfNewDay) return;

    setInterval(() => {
        locationCommand.resetIfNewDay();
    }, 60_000); // Check every minute
}

client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}`);
    loadCommands(client);
    await registerCommands(client);
    startBirthdayScheduler();
    startLocationResetScheduler();
});

// Load event handlers
require('./src/events/messageCreate')(client);
require('./src/events/interactionCreate')(client);

client.login(TOKEN);
