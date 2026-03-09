require('dotenv').config();

// Parse comma-separated channel IDs into arrays
function parseChannels(envValue) {
    if (!envValue) return [];
    return envValue.split(',').map(id => id.trim()).filter(Boolean);
}

module.exports = {
    TOKEN: process.env.BOT_TOKEN,
    CLIENT_ID: process.env.CLIENT_ID,
    GUILD_ID: process.env.GUILD_ID,
    
    // Channel configs - can be single ID or comma-separated for multiple
    TOWN_CHANNEL_ID: parseChannels(process.env.TOWN_CHANNEL_ID),
    NPC_LOOKUP_CHANNEL_ID: parseChannels(process.env.NPC_LOOKUP_CHANNEL_ID)
};
