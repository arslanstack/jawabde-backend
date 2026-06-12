const puppeteer = require('puppeteer');
const fs = require('fs');

function findSystemChrome() {
    const candidates = [
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
        process.env.LOCALAPPDATA + '\\Google\\Chrome\\Application\\chrome.exe',
    ];
    for (const p of candidates) {
        try { if (fs.existsSync(p)) return p; } catch {}
    }
    return null;
}

async function launchBrowser() {
    const systemChrome = findSystemChrome();
    const executablePath = systemChrome || await puppeteer.executablePath();
    console.log(`Using Chrome: ${executablePath}`);

    return puppeteer.launch({
        headless: true,
        executablePath,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--disable-extensions',
        ],
    });
}

module.exports = { launchBrowser };
