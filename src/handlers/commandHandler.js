const fs = require('fs');
const path = require('path');
const { REST, Routes } = require('discord.js');
const { TOKEN, CLIENT_ID, GUILD_ID } = require('../config');

function loadCommands(client) {
    const commandsPath = path.join(__dirname, '../commands');
    
    function loadFromDir(dir) {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            
            if (entry.isDirectory()) {
                loadFromDir(fullPath);
            } else if (entry.name.endsWith('.js')) {
                const command = require(fullPath);
                client.commands.set(command.data.name, command);
                console.log(`Loaded command: ${command.data.name}`);
            }
        }
    }
    
    loadFromDir(commandsPath);
}

async function registerCommands(client) {
    const commands = client.commands.map(cmd => cmd.data.toJSON());
    const rest = new REST({ version: '10' }).setToken(TOKEN);

    try {
        console.log('Registering slash commands...');
        await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
        console.log('Slash commands registered!');
    } catch (error) {
        console.error('Error registering commands:', error);
    }
}

module.exports = { loadCommands, registerCommands };
