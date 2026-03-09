const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const CHANNELS_PATH = path.join(__dirname, '../data/channels.json');

function getCommandChannels(commandName) {
    try {
        const channels = JSON.parse(fs.readFileSync(CHANNELS_PATH, 'utf8'));
        return channels[commandName] || [];
    } catch {
        return [];
    }
}

const activeTowns = new Map();

function createTownEmbed(townId, pass, hours, expiresAt, expired = false) {
    if (expired) {
        return new EmbedBuilder()
            .setColor(0xFF0000)
            .setTitle(`🏘️ Town ID:  ${townId} - Expired`)
            .setDescription('This town is no longer available.')
            .setTimestamp();
    }

    const timeLeft = Math.max(0, Math.ceil((expiresAt - Date.now()) / (1000 * 60 * 60)));

    return new EmbedBuilder()
        .setColor(0x00FF00)
        .setTitle(`🏘️ Town ID:  ${townId}`)
        .addFields(
            { name: 'Pass', value: pass, inline: true },
            { name: 'Available for', value: `${timeLeft} hour(s)`, inline: true }
        )
        .setFooter({ text: 'Expires' })
        .setTimestamp(expiresAt);
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('town')
        .setDescription('Post a town with ID, password, and availability')
        .addStringOption(option =>
            option.setName('id')
                .setDescription('Town ID')
                .setRequired(true))
        .addStringOption(option =>
            option.setName('pass')
                .setDescription('Password')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('hours')
                .setDescription('Hours available')
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(24)),

    channelRestriction: 'town',

    async execute(interaction, client) {
        const allowedChannels = getCommandChannels('town');
        if (allowedChannels.length > 0 && !allowedChannels.includes(interaction.channelId)) {
            const channelMentions = allowedChannels.map(id => `<#${id}>`).join(', ');
            return interaction.reply({
                content: `This command can only be used in: ${channelMentions}`,
                ephemeral: true
            });
        }

        const townId = interaction.options.getString('id');
        const pass = interaction.options.getString('pass');
        const hours = interaction.options.getInteger('hours');
        const expiresAt = Date.now() + (hours * 60 * 60 * 1000);

        const embed = createTownEmbed(townId, pass, hours, expiresAt);

        await interaction.reply({ embeds: [embed] });
        const message = await interaction.fetchReply();

        const townData = { townId, pass, hours, expiresAt, messageId: message.id, channelId: message.channelId };
        activeTowns.set(message.id, townData);

        setTimeout(async () => {
            try {
                const channel = await client.channels.fetch(townData.channelId);
                const msg = await channel.messages.fetch(townData.messageId);
                const expiredEmbed = createTownEmbed(townId, pass, hours, expiresAt, true);
                await msg.edit({ embeds: [expiredEmbed] });
                activeTowns.delete(message.id);
            } catch (error) {
                console.error('Could not edit expired town message:', error);
            }
        }, hours * 60 * 60 * 1000);
    }
};
