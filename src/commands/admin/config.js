const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const fs = require('fs');
const path = require('path');

const RESOURCE_PATH = path.join(__dirname, '../../data/resourceTypes.json');
const CHANNELS_PATH = path.join(__dirname, '../../data/channels.json');
const COMMANDS_PATH = path.join(__dirname, '../../data/commands.json');

function loadResourceTypes() {
    try {
        return JSON.parse(fs.readFileSync(RESOURCE_PATH, 'utf8'));
    } catch {
        return [];
    }
}

function saveResourceTypes(types) {
    fs.writeFileSync(RESOURCE_PATH, JSON.stringify(types, null, 4));
}

function loadChannels() {
    try {
        return JSON.parse(fs.readFileSync(CHANNELS_PATH, 'utf8'));
    } catch {
        return {};
    }
}

function saveChannels(channels) {
    fs.writeFileSync(CHANNELS_PATH, JSON.stringify(channels, null, 4));
}

function getCommandChoices() {
    try {
        const commands = JSON.parse(fs.readFileSync(COMMANDS_PATH, 'utf8'));
        return Object.keys(commands)
            .filter(name => name !== 'config')
            .map(name => ({ name, value: name }));
    } catch {
        return [];
    }
}

const COMMAND_CHOICES = getCommandChoices();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('config')
        .setDescription('Bot configuration (Admin only)')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addSubcommandGroup(group =>
            group.setName('resource')
                .setDescription('Manage resource types')
                .addSubcommand(sub =>
                    sub.setName('list')
                        .setDescription('List all resource types'))
                .addSubcommand(sub =>
                    sub.setName('add')
                        .setDescription('Add a new resource type')
                        .addStringOption(opt =>
                            opt.setName('name')
                                .setDescription('Display name (e.g., "Roaming Oak")')
                                .setRequired(true))
                        .addStringOption(opt =>
                            opt.setName('value')
                                .setDescription('Internal value (e.g., "roaming_oak") - lowercase, no spaces')
                                .setRequired(true)))
                .addSubcommand(sub =>
                    sub.setName('remove')
                        .setDescription('Remove a resource type')
                        .addStringOption(opt =>
                            opt.setName('value')
                                .setDescription('Internal value of the resource to remove')
                                .setRequired(true))))
        .addSubcommandGroup(group =>
            group.setName('channel')
                .setDescription('Manage where commands can be used')
                .addSubcommand(sub =>
                    sub.setName('list')
                        .setDescription('List allowed channels for a command')
                        .addStringOption(opt =>
                            opt.setName('command')
                                .setDescription('Command name')
                                .setRequired(true)
                                .addChoices(...COMMAND_CHOICES)))
                .addSubcommand(sub =>
                    sub.setName('add')
                        .setDescription('Add a channel where a command can be used')
                        .addStringOption(opt =>
                            opt.setName('command')
                                .setDescription('Command name')
                                .setRequired(true)
                                .addChoices(...COMMAND_CHOICES))
                        .addChannelOption(opt =>
                            opt.setName('channel')
                                .setDescription('Channel to allow')
                                .addChannelTypes(ChannelType.GuildText)
                                .setRequired(true)))
                .addSubcommand(sub =>
                    sub.setName('remove')
                        .setDescription('Remove a channel from a command')
                        .addStringOption(opt =>
                            opt.setName('command')
                                .setDescription('Command name')
                                .setRequired(true)
                                .addChoices(...COMMAND_CHOICES))
                        .addChannelOption(opt =>
                            opt.setName('channel')
                                .setDescription('Channel to remove')
                                .addChannelTypes(ChannelType.GuildText)
                                .setRequired(true)))),

    async execute(interaction) {
        const group = interaction.options.getSubcommandGroup();
        const subcommand = interaction.options.getSubcommand();

        if (group === 'resource') {
            const types = loadResourceTypes();

            if (subcommand === 'list') {
                if (types.length === 0) {
                    return interaction.reply({ content: 'No resource types configured.', ephemeral: true });
                }

                const embed = new EmbedBuilder()
                    .setColor(0x5865F2)
                    .setTitle('📋 Resource Types')
                    .setDescription(types.map((t, i) => `${i + 1}. **${t.name}** (\`${t.value}\`)`).join('\n'))
                    .setFooter({ text: `Total: ${types.length} types` });

                return interaction.reply({ embeds: [embed], ephemeral: true });
            }

            if (subcommand === 'add') {
                const name = interaction.options.getString('name');
                const value = interaction.options.getString('value').toLowerCase().replaceAll(/\s+/g, '_');

                if (types.some(t => t.value === value)) {
                    return interaction.reply({ content: `❌ Resource \`${value}\` already exists.`, ephemeral: true });
                }

                types.push({ name, value });
                saveResourceTypes(types);

                return interaction.reply({
                    content: `✅ Added resource type: **${name}** (\`${value}\`)\n⚠️ Run \`node deploy-commands.js\` to update the slash command choices.`,
                    ephemeral: true
                });
            }

            if (subcommand === 'remove') {
                const value = interaction.options.getString('value').toLowerCase();
                const index = types.findIndex(t => t.value === value);

                if (index === -1) {
                    return interaction.reply({ content: `❌ Resource \`${value}\` not found.`, ephemeral: true });
                }

                const removed = types.splice(index, 1)[0];
                saveResourceTypes(types);

                return interaction.reply({
                    content: `✅ Removed resource type: **${removed.name}** (\`${removed.value}\`)\n⚠️ Run \`node deploy-commands.js\` to update the slash command choices.`,
                    ephemeral: true
                });
            }
        }

        if (group === 'channel') {
            const commandName = interaction.options.getString('command').toLowerCase();
            const channels = loadChannels();

            // Initialize if command doesn't exist in channels
            if (!channels[commandName]) {
                channels[commandName] = [];
            }

            if (subcommand === 'list') {
                const cmdChannels = channels[commandName];
                if (cmdChannels.length === 0) {
                    return interaction.reply({ 
                        content: `📍 **/${commandName}** can be used in: **All channels**`, 
                        ephemeral: true 
                    });
                }

                const channelMentions = cmdChannels.map(id => `<#${id}>`).join(', ');
                return interaction.reply({ 
                    content: `📍 **/${commandName}** can be used in: ${channelMentions}`, 
                    ephemeral: true 
                });
            }

            if (subcommand === 'add') {
                const channel = interaction.options.getChannel('channel');
                
                if (channels[commandName].includes(channel.id)) {
                    return interaction.reply({ 
                        content: `❌ ${channel} is already allowed for \`/${commandName}\`.`, 
                        ephemeral: true 
                    });
                }

                channels[commandName].push(channel.id);
                saveChannels(channels);

                return interaction.reply({ 
                    content: `✅ Added ${channel} to \`/${commandName}\`.`, 
                    ephemeral: true 
                });
            }

            if (subcommand === 'remove') {
                const channel = interaction.options.getChannel('channel');
                
                if (!channels[commandName].includes(channel.id)) {
                    return interaction.reply({ 
                        content: `❌ ${channel} is not in the list for \`/${commandName}\`.`, 
                        ephemeral: true 
                    });
                }

                channels[commandName] = channels[commandName].filter(id => id !== channel.id);
                saveChannels(channels);

                const msg = channels[commandName].length === 0 
                    ? `✅ Removed ${channel} from \`/${commandName}\`. Command is now available in **all channels**.`
                    : `✅ Removed ${channel} from \`/${commandName}\`.`;

                return interaction.reply({ content: msg, ephemeral: true });
            }
        }
    }
};
