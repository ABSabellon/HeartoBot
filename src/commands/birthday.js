const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const BIRTHDAYS_PATH = path.join(__dirname, '../data/birthdays.json');
const CHANNELS_PATH = path.join(__dirname, '../data/channels.json');

function loadBirthdays() {
    try {
        return JSON.parse(fs.readFileSync(BIRTHDAYS_PATH, 'utf8'));
    } catch {
        return [];
    }
}

function saveBirthdays(birthdays) {
    fs.writeFileSync(BIRTHDAYS_PATH, JSON.stringify(birthdays, null, 4), 'utf8');
}

function getCommandChannels(commandName) {
    try {
        const channels = JSON.parse(fs.readFileSync(CHANNELS_PATH, 'utf8'));
        return channels[commandName] || [];
    } catch {
        return [];
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('birthday')
        .setDescription('Set or view birthdays')
        .addSubcommand(sub =>
            sub.setName('set')
                .setDescription('Set your birthday')
                .addIntegerOption(opt =>
                    opt.setName('month')
                        .setDescription('Birth month (1-12)')
                        .setRequired(true)
                        .setMinValue(1)
                        .setMaxValue(12))
                .addIntegerOption(opt =>
                    opt.setName('day')
                        .setDescription('Birth day (1-31)')
                        .setRequired(true)
                        .setMinValue(1)
                        .setMaxValue(31)))
        .addSubcommand(sub =>
            sub.setName('list')
                .setDescription('View all registered birthdays')),

    channelRestriction: 'birthday',

    async execute(interaction) {
        const allowedChannels = getCommandChannels('birthday');
        if (allowedChannels.length > 0 && !allowedChannels.includes(interaction.channelId)) {
            const channelMentions = allowedChannels.map(id => `<#${id}>`).join(', ');
            return interaction.reply({
                content: `This command can only be used in: ${channelMentions}`,
                ephemeral: true
            });
        }

        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'set') {
            const month = interaction.options.getInteger('month');
            const day = interaction.options.getInteger('day');

            // Basic date validation
            const daysInMonth = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
            if (day > daysInMonth[month - 1]) {
                return interaction.reply({
                    content: `❌ Invalid date. Month ${month} only has ${daysInMonth[month - 1]} days.`,
                    ephemeral: true
                });
            }

            const birthdays = loadBirthdays();
            const existing = birthdays.findIndex(b => b.userId === interaction.user.id);

            const entry = {
                userId: interaction.user.id,
                username: interaction.user.username,
                month,
                day,
                addedBy: interaction.user.username,
                addedAt: new Date().toISOString()
            };

            if (existing !== -1) {
                birthdays[existing] = entry;
            } else {
                birthdays.push(entry);
            }

            saveBirthdays(birthdays);

            const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                'July', 'August', 'September', 'October', 'November', 'December'];

            return interaction.reply({
                content: `🎂 Birthday set to **${monthNames[month - 1]} ${day}**!`,
                ephemeral: true
            });
        }

        if (subcommand === 'list') {
            const birthdays = loadBirthdays();

            if (birthdays.length === 0) {
                return interaction.reply({
                    embeds: [new EmbedBuilder()
                        .setColor(0xFFAA00)
                        .setTitle('🎂 Registered Birthdays')
                        .setDescription('No birthdays registered yet.')
                        .setTimestamp()]
                });
            }

            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

            // Sort by month then day
            const sorted = [...birthdays].sort((a, b) => a.month - b.month || a.day - b.day);
            const list = sorted.map(b =>
                `• **${monthNames[b.month - 1]} ${b.day}** - <@${b.userId}>`
            ).join('\n');

            return interaction.reply({
                embeds: [new EmbedBuilder()
                    .setColor(0xFF69B4)
                    .setTitle('🎂 Registered Birthdays')
                    .setDescription(list)
                    .setFooter({ text: `${birthdays.length} birthday(s) registered` })
                    .setTimestamp()]
            });
        }
    }
};
