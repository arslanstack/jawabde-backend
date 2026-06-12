const { launchBrowser } = require('./browser.cjs');
const fs = require('fs-extra');
const path = require('path');
const axios = require('axios');

const BASE_URL = 'https://www.pabalochistan.gov.pk';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
const DELAY_MS = 3000;

const DIRS = {
    photos:      path.resolve(__dirname, 'photos'),
    checkpoints: path.resolve(__dirname, 'checkpoints'),
    raw:         path.resolve(__dirname, 'raw'),
    errors:      path.resolve(__dirname, 'errors.log'),
};

const CHECKPOINT_FILE = path.join(DIRS.checkpoints, 'balochistan.json');
const LIST_FILE       = path.join(DIRS.raw, 'balochistan_member_list.json');
const PROFILES_FILE   = path.join(DIRS.raw, 'balochistan_profiles_raw.json');

const sleep = ms => new Promise(r => setTimeout(r, ms));

function logError(msg) {
    const line = `[BAL ${new Date().toISOString()}] ${msg}\n`;
    fs.appendFileSync(DIRS.errors, line);
    console.error(line.trim());
}

async function downloadPhoto(photoUrl, destPath) {
    if (await fs.pathExists(destPath)) return destPath;
    try {
        await sleep(DELAY_MS);
        const res = await axios.get(photoUrl, {
            responseType: 'arraybuffer',
            headers: { 'User-Agent': UA },
            timeout: 20000,
        });
        await fs.outputFile(destPath, res.data);
        return destPath;
    } catch (e) {
        logError(`Photo download failed ${photoUrl}: ${e.message}`);
        return null;
    }
}

async function getMemberList(page) {
    if (await fs.pathExists(LIST_FILE)) {
        console.log('Member list already exists, loading from file.');
        return fs.readJson(LIST_FILE);
    }

    console.log('Navigating to Balochistan members list...');
    await page.goto(`${BASE_URL}/list-members`, { waitUntil: 'networkidle2', timeout: 60000 });
    await sleep(3000);

    // Wait for member cards
    try {
        await page.waitForSelector('a[href*="member-profile"]', { timeout: 15000 });
    } catch (e) {
        // try scrolling to trigger lazy load
        await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
        await sleep(3000);
    }

    const members = await page.evaluate(() => {
        const results = [];
        const links = document.querySelectorAll('a[href*="member-profile"]');
        links.forEach(a => {
            const href = a.href || '';
            const idMatch = href.match(/member-profile\/(\d+)/);
            if (!idMatch) return;
            const id = parseInt(idMatch[1], 10);

            // Find constituency code in surrounding card
            const card = a.closest('div, li, tr, article') || a.parentElement;
            const cardText = card ? card.innerText : '';
            const codeMatch = cardText.match(/PB-\d+/i);
            const code = codeMatch ? codeMatch[0].toUpperCase() : null;

            // Get name from card or link text
            let name = a.innerText.trim();
            if (!name || name.length < 3) {
                const nameEl = card && (card.querySelector('h3, h4, h5, strong, b, .name, .member-name') || null);
                name = nameEl ? nameEl.innerText.trim() : '';
            }

            if (!results.find(r => r.id === id)) {
                results.push({ id, name, code, url: href });
            }
        });
        return results;
    });

    // Only keep PB- general seats
    const pbMembers = members.filter(m => m.code && m.code.startsWith('PB-'));
    console.log(`Found ${pbMembers.length} PB general seat members (${members.length} total links)`);
    await fs.outputJson(LIST_FILE, pbMembers, { spaces: 2 });
    return pbMembers;
}

async function scrapeProfile(page, member) {
    const url = `${BASE_URL}/member-profile/${member.id}`;
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    await sleep(DELAY_MS);

    const data = await page.evaluate(() => {
        const getText = (selector) => {
            const el = document.querySelector(selector);
            return el ? el.innerText.trim() : null;
        };

        // Photo: find storage img that is NOT the assembly logo
        let photoUrl = null;
        const storageImgs = document.querySelectorAll('img[src*="/storage/"]');
        for (const img of storageImgs) {
            const src = img.src || '';
            const lower = src.toLowerCase();
            if (lower.includes('logo') || lower.includes('icon') || lower.includes('banner')) continue;
            photoUrl = src;
            break;
        }
        // Fallback: date-based filename (member photos are named like 2024-04-25_07_46...)
        if (!photoUrl) {
            document.querySelectorAll('img').forEach(img => {
                if (photoUrl) return;
                const src = img.src || '';
                if (src.match(/\d{4}-\d{2}-\d{2}/) && src.match(/\.(jpg|jpeg|png|webp)/i)) photoUrl = src;
            });
        }

        // Name — h3/h4 that isn't the assembly title
        let name = '';
        for (const sel of ['h3', 'h4', 'h5']) {
            const el = document.querySelector(sel);
            if (el) {
                const t = el.innerText.trim();
                const SKIP_NAME = ['ASSEMBLY', 'BALOCHISTAN', 'MEMBER PROFILE', 'PROFILE', 'SECRETARY', 'SPEAKER', 'CHAIRMAN'];
                if (t && t.length > 3 && !SKIP_NAME.some(s => t.toUpperCase().includes(s))) {
                    name = t; break;
                }
            }
        }
        if (!name) name = getText('h1, h2') || '';

        // Try to get all labeled fields
        let constituency = null, party = null, email = null, phone = null, facebook_url = null, bio = null;

        // Profile fields from labeled paragraphs (Balochistan uses <p>Label: Value</p> format)
        document.querySelectorAll('p').forEach(el => {
            const text = el.innerText.trim();
            if (!constituency && text.match(/^PB-\d+$/)) { constituency = text; return; }
            if (!party && text.startsWith('Political Party:')) { party = text.replace('Political Party:', '').trim(); return; }
            if (!email && text.startsWith('Email:')) { const v = text.replace('Email:', '').trim(); if (v.includes('@')) email = v; return; }
            if (!phone && (text.startsWith('Phone Number:') || text.startsWith('Phone:'))) {
                const v = text.replace(/^Phone.*?:/, '').trim();
                if (v.match(/[\d+\-\s]{7,}/)) phone = v.replace(/\s+/g, '');
            }
        });
        // Fallback: table/dl fields
        if (!party) {
            document.querySelectorAll('tr, dl dt, .field-label').forEach(el => {
                if (party) return;
                const label = el.innerText.trim().toLowerCase();
                const valEl = el.nextElementSibling || (el.closest('tr') && el.closest('tr').lastElementChild);
                const val = valEl ? valEl.innerText.trim() : '';
                if (label.includes('party') || label.includes('political')) party = val || party;
            });
        }

        // Facebook — skip share/generic links
        document.querySelectorAll('a[href*="facebook.com"]').forEach(a => {
            if (facebook_url) return;
            const href = a.href || '';
            if (href && href !== '#' && !href.includes('sharer') && href.includes('facebook.com/')) {
                facebook_url = href;
            }
        });

        // Bio â€” any paragraph-length text block
        document.querySelectorAll('p, .bio, .about, .description').forEach(el => {
            const t = el.innerText.trim();
            if (t.length > 80 && !bio) bio = t;
        });

        return { photoUrl, name, constituency, party, email, phone, facebook_url, bio };
    });

    // Download photo
    let photo_local = null;
    if (data.photoUrl) {
        const ext = data.photoUrl.split('.').pop().split('?')[0].toLowerCase();
        const filename = `balochistan_${member.id}.${ext.match(/^(jpg|jpeg|png|webp)$/) ? ext : 'jpg'}`;
        const destPath = path.join(DIRS.photos, filename);
        photo_local = await downloadPhoto(data.photoUrl, destPath);
        if (photo_local) photo_local = path.relative(path.resolve(__dirname, '..', '..'), photo_local).replace(/\\/g, '/');
    }

    return {
        id: member.id,
        code: member.code,
        name: data.name || member.name,
        photo_local,
        photo_url: data.photoUrl,
        bio: data.bio,
        email: data.email,
        phone: data.phone,
        party: data.party,
        facebook_url: data.facebook_url,
        source: 'pabalochistan.gov.pk',
    };
}

async function main() {
    await fs.ensureDir(DIRS.photos);
    await fs.ensureDir(DIRS.checkpoints);
    await fs.ensureDir(DIRS.raw);

    const browser = await launchBrowser();
    const page = await browser.newPage();
    await page.setUserAgent(UA);

    try {
        const members = await getMemberList(page);

        let checkpoint = { completed: [] };
        if (await fs.pathExists(CHECKPOINT_FILE)) checkpoint = await fs.readJson(CHECKPOINT_FILE);

        let profiles = [];
        if (await fs.pathExists(PROFILES_FILE)) profiles = await fs.readJson(PROFILES_FILE);

        const completedIds = new Set(checkpoint.completed);
        let newCount = 0;

        for (const member of members) {
            if (completedIds.has(member.id)) {
                console.log(`  SKIP ${member.id} ${member.code} (already done)`);
                continue;
            }

            console.log(`Scraping ${member.code} â€” id:${member.id} â€” ${member.name}`);
            try {
                const profile = await scrapeProfile(page, member);
                console.log(`  name=${profile.name} party=${profile.party || 'NULL'} photo=${profile.photo_url ? profile.photo_url.split('/').pop() : 'NONE'}`);
                profiles.push(profile);
                completedIds.add(member.id);
                newCount++;

                if (newCount % 10 === 0) {
                    checkpoint.completed = [...completedIds];
                    await fs.outputJson(CHECKPOINT_FILE, checkpoint, { spaces: 2 });
                    await fs.outputJson(PROFILES_FILE, profiles, { spaces: 2 });
                    console.log(`  Checkpoint saved (${completedIds.size} done)`);
                }
            } catch (e) {
                logError(`Failed id:${member.id} ${member.code}: ${e.message}`);
            }
        }

        checkpoint.completed = [...completedIds];
        await fs.outputJson(CHECKPOINT_FILE, checkpoint, { spaces: 2 });
        await fs.outputJson(PROFILES_FILE, profiles, { spaces: 2 });
        console.log(`\nBalochistan done. ${profiles.length} profiles saved.`);
    } finally {
        await browser.close();
    }
}

main().catch(e => { logError(`Fatal: ${e.message}`); process.exit(1); });

