const fs = require('fs');
const path = require('path');

const SETTINGS_PATH = path.join(__dirname, '../data/settings.json');

function loadSettings() {
    try {
        return JSON.parse(fs.readFileSync(SETTINGS_PATH, 'utf8'));
    } catch {
        return {
            timezone: { name: 'Asia/Manila', label: 'Philippine Time (PHT)', utcOffset: 8 },
            locationResetHour: 7,
            birthdayGreetHour: 9
        };
    }
}

function saveSettings(settings) {
    fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 4), 'utf8');
}

/**
 * Get current Date object adjusted to the configured timezone.
 */
function getNow() {
    const settings = loadSettings();
    const offset = settings.timezone.utcOffset * 60;
    const now = new Date();
    const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
    return new Date(utc + (offset * 60000));
}

module.exports = { loadSettings, saveSettings, getNow, SETTINGS_PATH };
