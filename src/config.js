require('dotenv').config();

module.exports = {
    TOKEN: process.env.BOT_TOKEN,
    CLIENT_ID: process.env.CLIENT_ID,
    TOWN_CHANNEL_ID: process.env.TOWN_CHANNEL_ID,
    NPC_LOOKUP_CHANNEL_ID: process.env.NPC_LOOKUP_CHANNEL_ID,
    GUILD_ID: process.env.GUILD_ID
};
