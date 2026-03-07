const { TOWN_CHANNEL_ID, NPC_LOOKUP_CHANNEL_ID } = require('../config');

module.exports = (client) => {
    client.on('messageCreate', async (message) => {
        // Delete non-bot messages in the town channel
        if (message.channelId === TOWN_CHANNEL_ID && !message.author.bot) {
            try {
                await message.delete();
                
                // Send usage hint that auto-deletes after 10 seconds
                const hint = await message.channel.send({
                    content: `${message.author}, please use the slash command:\n/town \`id\` \`pass\` \`hours (1-24)\``
                });
                
                setTimeout(() => hint.delete().catch(() => {}), 10000);
            } catch (error) {
                console.error('Could not delete message:', error);
            }
        }

        // Delete non-bot messages in the npc-lookup channel
        if (message.channelId === NPC_LOOKUP_CHANNEL_ID && !message.author.bot) {
            try {
                await message.delete();
                
                const hint = await message.channel.send({
                    content: `${message.author}, please use the slash command:\n/location add \`type\` \`location\`\n/location list`
                });
                
                setTimeout(() => hint.delete().catch(() => {}), 10000);
            } catch (error) {
                console.error('Could not delete message:', error);
            }
        }
    });
};
