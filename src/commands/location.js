const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const RESOURCE_PATH = path.join(__dirname, '../data/resourceTypes.json');
const CHANNELS_PATH = path.join(__dirname, '../data/channels.json');

// Store locations - resets daily at 7 AM PHT (UTC+8)
let dailyLocations = [];
let lastResetTime = getNext7AMPHT();

function getNext7AMPHT() {
    const now = new Date();
    
    // Get current time in PHT (UTC+8)
    const phtOffset = 8 * 60; // PHT is UTC+8
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    const phtNow = new Date(utc + (phtOffset * 60000));
    
    // Create 7 AM PHT for today
    const today7AMPHT = new Date(phtNow);
    today7AMPHT.setHours(7, 0, 0, 0);
    
    // If it's before 7 AM PHT, the current period started yesterday at 7 AM
    if (phtNow.getHours() < 7) {
        today7AMPHT.setDate(today7AMPHT.getDate() - 1);
    }
    
    // Convert back to UTC timestamp
    return today7AMPHT.getTime() - (phtOffset * 60000) + (now.getTimezoneOffset() * 60000);
}

function checkAndResetDaily() {
    const currentPeriodStart = getNext7AMPHT();
    
    if (currentPeriodStart > lastResetTime) {
        dailyLocations = [];
        lastResetTime = currentPeriodStart;
    }
}

function loadResourceTypes() {
    try {
        return JSON.parse(fs.readFileSync(RESOURCE_PATH, 'utf8'));
    } catch {
        return [];
    }
}

function getCommandChannels(commandName) {
    try {
        const channels = JSON.parse(fs.readFileSync(CHANNELS_PATH, 'utf8'));
        return channels[commandName] || [];
    } catch {
        return [];
    }
}

const RESOURCE_TYPES = loadResourceTypes();

function createLocationListEmbed() {
    checkAndResetDaily();

    if (dailyLocations.length === 0) {
        return new EmbedBuilder()
            .setColor(0xFFAA00)
            .setTitle('📍 Today\'s Locations')
            .setDescription('No locations have been added today yet.')
            .setFooter({ text: `Resets daily at 7:00 AM PHT` })
            .setTimestamp();
    }

    const locationsByType = {};
    dailyLocations.forEach(loc => {
        if (!locationsByType[loc.type]) {
            locationsByType[loc.type] = [];
        }
        locationsByType[loc.type].push(loc);
    });

    const embed = new EmbedBuilder()
        .setColor(0x00FF00)
        .setTitle('📍 Today\'s Locations')
        .setFooter({ text: `Total: ${dailyLocations.length} location(s) | Resets at 7:00 AM PHT` })
        .setTimestamp();

    for (const [type, locations] of Object.entries(locationsByType)) {
        const typeName = RESOURCE_TYPES.find(r => r.value === type)?.name || type;
        const locationList = locations.map(loc => 
            `• ${loc.location} - added by ${loc.addedBy}`
        ).join('\n');
        embed.addFields({ name: typeName, value: locationList });
    }

    return embed;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('location')
        .setDescription('Add or view resource locations for today')
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Add a resource location')
                .addStringOption(option =>
                    option.setName('type')
                        .setDescription('Type of resource')
                        .setRequired(true)
                        .addChoices(...RESOURCE_TYPES))
                .addStringOption(option =>
                    option.setName('location')
                        .setDescription('Where is it located? (e.g., coordinates, area name)')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('View all locations added today'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('update')
                .setDescription('Update a resource location you added (or any if mod/admin)')
                .addStringOption(option =>
                    option.setName('type')
                        .setDescription('Type of resource to update')
                        .setRequired(true)
                        .addChoices(...RESOURCE_TYPES))
                .addStringOption(option =>
                    option.setName('location')
                        .setDescription('New location')
                        .setRequired(true))),

    channelRestriction: 'location',

    async execute(interaction) {
        const allowedChannels = getCommandChannels('location');
        if (allowedChannels.length > 0 && !allowedChannels.includes(interaction.channelId)) {
            const channelMentions = allowedChannels.map(id => `<#${id}>`).join(', ');
            return interaction.reply({
                content: `This command can only be used in: ${channelMentions}`,
                ephemeral: true
            });
        }

        checkAndResetDaily();

        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'add') {
            const type = interaction.options.getString('type');
            const location = interaction.options.getString('location');
            const addedBy = interaction.user.username;

            // Check if this type already has a location for today
            const existingLocation = dailyLocations.find(loc => loc.type === type);
            if (existingLocation) {
                const typeName = RESOURCE_TYPES.find(r => r.value === type)?.name || type;
                return interaction.reply({
                    content: `❌ **${typeName}** location has already been added today by ${existingLocation.addedBy}: ${existingLocation.location}`,
                    ephemeral: true
                });
            }

            dailyLocations.push({
                type,
                location,
                addedBy,
                addedAt: new Date()
            });

            const typeName = RESOURCE_TYPES.find(r => r.value === type)?.name || type;

            const reply = await interaction.reply({
                content: `✅ Added **${typeName}** location: ${location}`,
                ephemeral: false,
                fetchReply: true
            });

            // Auto-delete success message after 10 seconds
            setTimeout(() => reply.delete().catch(() => {}), 10000);
            return;
        }

        if (subcommand === 'list') {
            const embed = createLocationListEmbed();
            return interaction.reply({ embeds: [embed] });
        }
    }
};
