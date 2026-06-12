// Sindh Assembly scraper — all data in the directory listing page (DataTables)
// No individual profile visits needed
const { launchBrowser } = require('./browser.cjs');
const fs = require('fs-extra');
const path = require('path');
const axios = require('axios');

const BASE_URL = 'https://pas.gov.pk';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const DIRS = {
    photos:      path.resolve(__dirname, 'photos'),
    raw:         path.resolve(__dirname, 'raw'),
    errors:      path.resolve(__dirname, 'errors.log'),
};

const PROFILES_FILE = path.join(DIRS.raw, 'sindh_profiles_raw.json');

const sleep = ms => new Promise(r => setTimeout(r, ms));

function logError(msg) {
    const line = '[SIN ' + new Date().toISOString() + '] ' + msg + '\n';
    fs.appendFileSync(DIRS.errors, line);
    console.error(line.trim());
}

async function downloadPhoto(photoUrl, destPath) {
    if (await fs.pathExists(destPath)) return destPath;
    try {
        await sleep(400);
        const res = await axios.get(photoUrl, {
            responseType: 'arraybuffer',
            headers: { 'User-Agent': UA },
            timeout: 20000,
        });
        await fs.outputFile(destPath, res.data);
        return destPath;
    } catch (e) {
        logError('Photo download failed ' + photoUrl + ': ' + e.message);
        return null;
    }
}

async function main() {
    await fs.ensureDir(DIRS.photos);
    await fs.ensureDir(DIRS.raw);

    const browser = await launchBrowser();
    const page = await browser.newPage();
    await page.setUserAgent(UA);

    let members = [];
    try {
        console.log('Navigating to Sindh assembly members directory...');
        await page.goto(BASE_URL + '/assembly-members-directory', { waitUntil: 'networkidle2', timeout: 60000 });
        await sleep(4000);

        members = await page.evaluate(() => {
            const results = [];
            document.querySelectorAll('.card.shadow').forEach(card => {
                const img = card.querySelector('img');
                const photoUrl = img ? img.src : null;

                const text = card.innerText || '';
                const lines = text.split('\n').map(function(l) { return l.trim(); }).filter(function(l) { return l.length > 0; });

                const name = lines[0] || '';
                let party = null, constituency = null, email = null;

                lines.forEach(function(line) {
                    if (line.startsWith('Party Affiliation:')) {
                        const v = line.replace('Party Affiliation:', '').trim();
                        if (v) party = v;
                    } else if (line.startsWith('Constituency:')) {
                        const v = line.replace('Constituency:', '').trim();
                        if (v) constituency = v;
                    } else if (line.startsWith('Email:')) {
                        const v = line.replace('Email:', '').trim();
                        if (v && v.includes('@')) email = v;
                    }
                });

                let code = null;
                if (constituency) {
                    const m = constituency.match(/PS-(\d+)/i);
                    if (m) code = 'PS-' + parseInt(m[1], 10);
                }

                if (name && name.length > 2 && name !== '-> View Detail') {
                    results.push({ name: name, code: code, constituency: constituency, party: party, email: email, photoUrl: photoUrl });
                }
            });
            return results;
        });

        console.log('Extracted ' + members.length + ' Sindh members from directory page');
    } finally {
        await browser.close();
    }

    const profiles = [];
    for (let i = 0; i < members.length; i++) {
        const m = members[i];
        process.stdout.write('\rDownloading photos... ' + (i + 1) + '/' + members.length);

        let photo_local = null;
        if (m.photoUrl) {
            const urlParts = m.photoUrl.split('?')[0].split('.');
            const ext = urlParts[urlParts.length - 1].toLowerCase();
            const filename = 'sindh_' + (i + 1) + '.' + (ext.match(/^(jpg|jpeg|png|webp)$/) ? ext : 'jpg');
            const destPath = path.join(DIRS.photos, filename);
            const downloaded = await downloadPhoto(m.photoUrl, destPath);
            if (downloaded) photo_local = 'chittar_data/enrichment/photos/' + filename;
        }

        profiles.push({
            code: m.code,
            name: m.name,
            constituency: m.constituency,
            photo_local: photo_local,
            photo_url: m.photoUrl,
            bio: null,
            email: m.email,
            phone: null,
            party: m.party,
            facebook_url: null,
            source: 'pas.gov.pk',
        });
    }

    console.log('');
    await fs.outputJson(PROFILES_FILE, profiles, { spaces: 2 });

    const withCode = profiles.filter(function(p) { return p.code; }).length;
    const withParty = profiles.filter(function(p) { return p.party; }).length;
    const withPhoto = profiles.filter(function(p) { return p.photo_url; }).length;
    const withEmail = profiles.filter(function(p) { return p.email; }).length;
    console.log('Sindh done. ' + profiles.length + ' profiles saved.');
    console.log('  With PS- code: ' + withCode + ' | party: ' + withParty + ' | photo: ' + withPhoto + ' | email: ' + withEmail);
}

main().catch(function(e) { logError('Fatal: ' + e.message); process.exit(1); });
