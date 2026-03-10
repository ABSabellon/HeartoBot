const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const RESOURCE_PATH = path.join(__dirname, '../data/resourceTypes.json');
const CHANNELS_PATH = path.join(__dirname, '../data/channels.json');
const LOCATIONS_PATH = path.join(__dirname, '../data/locations.json');
const { loadSettings, getNow } = require('../utils/settings');

// Store locations - resets daily based on configured timezone
let dailyLocations = [];

// Get today's period date string (YYYY-MM-DD) based on configured reset hour
function getPeriodDate() {
    const settings = loadSettings();
    const now = getNow();

    if (now.getHours() < settings.locationResetHour) {
        now.setDate(now.getDate() - 1);
    }

    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function loadLocationData() {
    try {
        return JSON.parse(fs.readFileSync(LOCATIONS_PATH, 'utf8'));
    } catch {
        return { periodDate: null, locations: [] };
    }
}

function saveLocationData() {
    const data = { periodDate: getPeriodDate(), locations: dailyLocations };
    fs.writeFileSync(LOCATIONS_PATH, JSON.stringify(data, null, 4), 'utf8');
}

function checkAndResetDaily() {
    const today = getPeriodDate();
    const saved = loadLocationData();

    if (saved.periodDate === today) {
        // Same day — load from file if memory is empty (e.g. after restart)
        if (dailyLocations.length === 0 && saved.locations.length > 0) {
            dailyLocations = saved.locations;
        }
    } else {
        // New day — clear everything
        dailyLocations = [];
        saveLocationData();
    }
}

// Called from index.js on a scheduled interval to proactively reset
function resetIfNewDay() {
    checkAndResetDaily();
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

// Initialize: load locations and clear if stale
checkAndResetDaily();

function createLocationListEmbed() {
    checkAndResetDaily();
    const settings = loadSettings();
    const tzLabel = settings.timezone.label;
    const resetHour = settings.locationResetHour;
    const resetTime = `${resetHour}:00 AM ${tzLabel}`;

    if (dailyLocations.length === 0) {
        return new EmbedBuilder()
            .setColor(0xFFAA00)
            .setTitle('📍 Today\'s Locations')
            .setDescription('No locations have been added today yet.')
            .setFooter({ text: `Resets daily at ${resetTime}` })
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
        .setFooter({ text: `Total: ${dailyLocations.length} location(s) | Resets at ${resetTime}` })
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
    resetIfNewDay,

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
                addedById: interaction.user.id,
                addedAt: new Date().toISOString()
            });

            saveLocationData();

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

        if (subcommand === 'update') {
            const type = interaction.options.getString('type');
            const location = interaction.options.getString('location');

            const existingIndex = dailyLocations.findIndex(loc => loc.type === type);
            const typeName = RESOURCE_TYPES.find(r => r.value === type)?.name || type;

            if (existingIndex === -1) {
                return interaction.reply({
                    content: `❌ No **${typeName}** location has been added today yet.`,
                    ephemeral: true
                });
            }

            const existing = dailyLocations[existingIndex];

            // Only the original author, or mods/admins can update
            const isMod = interaction.member.permissions.has('ManageMessages');
            if (existing.addedById !== interaction.user.id && !isMod) {
                return interaction.reply({
                    content: `❌ Only **${existing.addedBy}** or a moderator can update this location.`,
                    ephemeral: true
                });
            }

            dailyLocations[existingIndex] = {
                ...existing,
                location,
                addedBy: interaction.user.username,
                addedById: interaction.user.id,
                addedAt: new Date().toISOString()
            };

            saveLocationData();

            const reply = await interaction.reply({
                content: `✅ Updated **${typeName}** location to: ${location}`,
                ephemeral: false,
                fetchReply: true
            });

            setTimeout(() => reply.delete().catch(() => {}), 10000);
        }
    }
};
