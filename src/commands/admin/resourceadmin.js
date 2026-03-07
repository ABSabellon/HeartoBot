const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');

const DATA_PATH = path.join(__dirname, '../../data/resourceTypes.json');

function loadResourceTypes() {
    try {
        return JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
    } catch {
        return [];
    }
}

function saveResourceTypes(types) {
    fs.writeFileSync(DATA_PATH, JSON.stringify(types, null, 4));
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('resourceadmin')
        .setDescription('Manage resource types (Admin only)')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
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
                        .setRequired(true))),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
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
            const value = interaction.options.getString('value').toLowerCase().replace(/\s+/g, '_');

            if (types.find(t => t.value === value)) {
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
};
