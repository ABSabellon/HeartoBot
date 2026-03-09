const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');

const COMMANDS_CONFIG_PATH = path.join(__dirname, '../data/commands.json');
const CHANNELS_PATH = path.join(__dirname, '../data/channels.json');

function loadCommandsConfig() {
    try {
        return JSON.parse(fs.readFileSync(COMMANDS_CONFIG_PATH, 'utf8'));
    } catch {
        return {};
    }
}

function loadChannels() {
    try {
        return JSON.parse(fs.readFileSync(CHANNELS_PATH, 'utf8'));
    } catch {
        return {};
    }
}

function userHasPermission(member, permission) {
    if (permission === 'everyone') return true;
    if (permission === 'ManageGuild') return member.permissions.has(PermissionFlagsBits.ManageGuild);
    return false;
}

function getChannelMentions(channels) {
    if (!channels || channels.length === 0) return 'All channels';
    return channels.map(id => `<#${id}>`).join(', ');
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('View available commands and their usage')
        .addStringOption(option =>
            option.setName('command')
                .setDescription('Get detailed info about a specific command')
                .setRequired(false)),

    async execute(interaction) {
        const commandsConfig = loadCommandsConfig();
        const channelsConfig = loadChannels();
        const commandName = interaction.options.getString('command');

        if (commandName) {
            // Show specific command details
            const cmd = commandsConfig[commandName.toLowerCase()];
            
            if (!cmd || !cmd.enabled) {
                return interaction.reply({ 
                    content: `❌ Command \`${commandName}\` not found.`, 
                    ephemeral: true 
                });
            }

            if (!userHasPermission(interaction.member, cmd.permissions)) {
                return interaction.reply({ 
                    content: `❌ You don't have permission to view this command.`, 
                    ephemeral: true 
                });
            }

            const channels = channelsConfig[commandName.toLowerCase()] || [];
            const embed = new EmbedBuilder()
                .setColor(0x5865F2)
                .setTitle(`📖 /${commandName}`)
                .setDescription(cmd.description)
                .addFields({ name: 'Available in', value: getChannelMentions(channels) });

            if (cmd.usage) {
                embed.addFields({ name: 'Usage', value: `\`${cmd.usage}\`` });
            }

            if (cmd.subcommands) {
                let subList = '';
                for (const [name, value] of Object.entries(cmd.subcommands)) {
                    if (typeof value === 'string') {
                        // Simple subcommand
                        subList += `\`${name}\` - ${value}\n`;
                    } else if (typeof value === 'object' && value.subcommands) {
                        // Nested subcommand group
                        subList += `**${name}** - ${value.description}\n`;
                        for (const [subName, subDesc] of Object.entries(value.subcommands)) {
                            subList += `  └ \`${subName}\` - ${subDesc}\n`;
                        }
                    }
                }
                embed.addFields({ name: 'Subcommands', value: subList.trim() });
            }

            return interaction.reply({ embeds: [embed], ephemeral: true });
        }

        // Show all available commands
        const embed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle('📚 Available Commands')
            .setDescription('Use `/help <command>` for detailed info about a specific command.');

        const availableCommands = [];

        for (const [name, cmd] of Object.entries(commandsConfig)) {
            if (!cmd.enabled) continue;
            if (!userHasPermission(interaction.member, cmd.permissions)) continue;
            
            const channelInfo = getChannelMentions(cmd.channels);
            availableCommands.push(`\`/${name}\` - ${cmd.description}\n↳ *${channelInfo}*`);
        }

        if (availableCommands.length === 0) {
            embed.setDescription('No commands available.');
        } else {
            embed.addFields({ name: 'Commands', value: availableCommands.join('\n\n') });
        }

        return interaction.reply({ embeds: [embed], ephemeral: true });
    }
};
