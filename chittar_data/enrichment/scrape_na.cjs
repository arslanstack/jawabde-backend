const { launchBrowser } = require('./browser.cjs');
const fs = require('fs-extra');
const path = require('path');
const axios = require('axios');

const BASE_URL = 'https://na.gov.pk';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
const DELAY_MS = 3000;

const DIRS = {
    photos:      path.resolve(__dirname, 'photos'),
    checkpoints: path.resolve(__dirname, 'checkpoints'),
    raw:         path.resolve(__dirname, 'raw'),
    errors:      path.resolve(__dirname, 'errors.log'),
};

const CHECKPOINT_FILE   = path.join(DIRS.checkpoints, 'na.json');
const PROFILES_FILE     = path.join(DIRS.raw, 'na_profiles_raw.json');
const PHOTO_MAP_FILE    = path.resolve(__dirname, '..', 'photos', 'mna_photo_map.json');
const PHOTO_URLS_FILE   = path.resolve(__dirname, '..', 'photos', 'mna_photo_urls.json');
const MNAS_FILE         = path.resolve(__dirname, '..', 'politicians', 'mnas.json');

const sleep = ms => new Promise(r => setTimeout(r, ms));

function logError(msg) {
    const line = `[NA ${new Date().toISOString()}] ${msg}\n`;
    fs.appendFileSync(DIRS.errors, line);
    console.error(line.trim());
}

function stripTitles(name) {
    return name
        .replace(/^(Syed|Mian|Ch\.|Chaudhry|Dr\.|Raja|Rana|Malik|Hafiz|Maulana|Sheikh|Sardar|Mr\.|Ms\.|Mrs\.|Begum|Bibi|Haji|Pir|Mir|Khan|Lt\.|Col\.|Brig\.|Gen\.)\s+/gi, '')
        .trim()
        .toLowerCase();
}

function matchName(scraped, target) {
    const s = scraped.toLowerCase().trim();
    const t = target.toLowerCase().trim();
    if (s === t) return true;

    const sStripped = stripTitles(scraped);
    const tStripped = stripTitles(target);
    if (sStripped === tStripped) return true;

    // Last two words
    const sWords = sStripped.split(/\s+/);
    const tWords = tStripped.split(/\s+/);
    if (sWords.length >= 2 && tWords.length >= 2) {
        const sLast2 = sWords.slice(-2).join(' ');
        const tLast2 = tWords.slice(-2).join(' ');
        if (sLast2 === tLast2) return true;
    }

    return false;
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

async function buildMissingUidMap() {
    const mnas = await fs.readJson(MNAS_FILE);
    const photoMap = await fs.readJson(PHOTO_MAP_FILE); // { "NA-1": "mna_1234.jpg", ... }
    const photoUrls = await fs.readJson(PHOTO_URLS_FILE); // [{ name, uid }, ...] or { name: uid }

    // Normalize photoUrls to array of { name, uid }
    let uidList = [];
    if (Array.isArray(photoUrls)) {
        uidList = photoUrls;
    } else {
        uidList = Object.entries(photoUrls).map(([name, uid]) => ({ name, uid }));
    }

    const alreadyMapped = new Set(Object.keys(photoMap));
    const missing = mnas.filter(m => !alreadyMapped.has(m.constituency_code));
    console.log(`MNAs already mapped: ${alreadyMapped.size}, missing: ${missing.length}`);

    const result = []; // { uid, code, name, match_method }

    // Also include already-mapped ones for profile enrichment (bio/email etc)
    for (const mna of mnas) {
        const code = mna.constituency_code;
        const memberName = mna.member_name;

        // Already mapped: get uid from photo map filename, photo_url from uidList
        if (alreadyMapped.has(code)) {
            const filename = photoMap[code]; // e.g. mna_1234.jpg
            const uidMatch = filename.match(/mna_(\d+)/);
            if (uidMatch) {
                const uid = uidMatch[1];
                const urlEntry = uidList.find(u => String(u.uid) === String(uid));
                result.push({ uid, code, name: memberName, match_method: 'photo_map',
                    photo_url: urlEntry ? urlEntry.photo_url : null,
                    photo_local_existing: filename }); // filename already contains full relative path
            }
            continue;
        }

        // Try to match by name in uidList
        let matched = null;
        let method = null;

        // Exact
        matched = uidList.find(u => u.name.toLowerCase().trim() === memberName.toLowerCase().trim());
        if (matched) method = 'exact_name';

        // Stripped titles
        if (!matched) {
            matched = uidList.find(u => stripTitles(u.name) === stripTitles(memberName));
            if (matched) method = 'stripped_name';
        }

        // Last 2 words
        if (!matched) {
            const targetWords = stripTitles(memberName).split(/\s+/);
            if (targetWords.length >= 2) {
                const target2 = targetWords.slice(-2).join(' ');
                matched = uidList.find(u => {
                    const uWords = stripTitles(u.name).split(/\s+/);
                    return uWords.length >= 2 && uWords.slice(-2).join(' ') === target2;
                });
                if (matched) method = 'last_two_words';
            }
        }

        if (matched) {
            // Include photo_url from uidList directly (saves scraping the profile page for it)
            result.push({ uid: matched.uid, code, name: memberName, match_method: method, photo_url: matched.photo_url || null });
        } else {
            logError(`No UID match for: ${code} — ${memberName}`);
        }
    }

    return result;
}

async function scrapeProfile(page, entry) {
    const { uid, code, name, photo_url: knownPhotoUrl, photo_local_existing } = entry;
    const url = `${BASE_URL}/en/profile.php?uid=${uid}`;
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    await sleep(DELAY_MS);

    const data = await page.evaluate(() => {
        let bio = null, email = null, phone = null;

        document.querySelectorAll('td, dt, th, label, strong, b').forEach(el => {
            const label = el.innerText.trim().toLowerCase();
            const valEl = el.nextElementSibling || (el.closest('tr') && el.closest('tr').cells && el.closest('tr').cells[1]);
            const val = valEl ? valEl.innerText.trim() : '';
            if (label.includes('email') || label.includes('e-mail')) {
                if (!email && val.includes('@')) email = val;
            }
            if (label.includes('phone') || label.includes('mobile') || label.includes('contact')) {
                if (!phone && val.match(/[\d+\-\s]{7,}/)) phone = val.replace(/\s+/g, '');
            }
        });

        document.querySelectorAll('p, .bio, .about, .education, .profile-text').forEach(el => {
            const t = el.innerText.trim();
            if (t.length > 80 && !bio) bio = t;
        });

        return { bio, email, phone };
    });

    // Photo: use pre-known URL from mna_photo_urls.json — don't trust the profile page for this
    let photo_local = photo_local_existing || null;
    let finalPhotoUrl = knownPhotoUrl || null;

    if (finalPhotoUrl && !photo_local_existing) {
        // Need to download (not already in chittar_data/photos/)
        const ext = finalPhotoUrl.split('.').pop().split('?')[0].toLowerCase();
        const filename = `mna_${uid}.${ext.match(/^(jpg|jpeg|png|webp)$/) ? ext : 'jpg'}`;
        const enrichPath = path.join(DIRS.photos, filename);
        const downloaded = await downloadPhoto(finalPhotoUrl, enrichPath);
        if (downloaded) photo_local = 'chittar_data/enrichment/photos/' + filename;
    }

    return {
        uid: String(uid),
        code,
        name,
        photo_local,
        photo_url: finalPhotoUrl,
        bio: data.bio,
        email: data.email,
        phone: data.phone,
        source: 'na.gov.pk',
    };
}

async function main() {
    await fs.ensureDir(DIRS.photos);
    await fs.ensureDir(DIRS.checkpoints);
    await fs.ensureDir(DIRS.raw);

    const uidMap = await buildMissingUidMap();
    console.log(`Total NA members to scrape: ${uidMap.length}`);

    let checkpoint = { completed: [] };
    if (await fs.pathExists(CHECKPOINT_FILE)) checkpoint = await fs.readJson(CHECKPOINT_FILE);

    let profiles = [];
    if (await fs.pathExists(PROFILES_FILE)) profiles = await fs.readJson(PROFILES_FILE);

    const completedCodes = new Set(checkpoint.completed);
    let newCount = 0;

    const browser = await launchBrowser();
    const page = await browser.newPage();
    await page.setUserAgent(UA);

    try {
        for (const entry of uidMap) {
            if (completedCodes.has(entry.code)) {
                console.log(`  SKIP ${entry.code} (already done)`);
                continue;
            }

            console.log(`Scraping ${entry.code} â€" uid:${entry.uid} â€" ${entry.name}`);
            try {
                const profile = await scrapeProfile(page, entry);
                console.log(`  photo=${profile.photo_url ? profile.photo_url.split('/').pop().slice(0,30) : 'NONE'} phone=${profile.phone || '-'}`);
                profiles.push(profile);
                completedCodes.add(entry.code);
                newCount++;

                if (newCount % 10 === 0) {
                    checkpoint.completed = [...completedCodes];
                    await fs.outputJson(CHECKPOINT_FILE, checkpoint, { spaces: 2 });
                    await fs.outputJson(PROFILES_FILE, profiles, { spaces: 2 });
                    console.log(`  Checkpoint saved (${completedCodes.size} done)`);
                }
            } catch (e) {
                logError(`Failed ${entry.code} uid:${entry.uid}: ${e.message}`);
            }
        }
    } finally {
        await browser.close();
    }

    checkpoint.completed = [...completedCodes];
    await fs.outputJson(CHECKPOINT_FILE, checkpoint, { spaces: 2 });
    await fs.outputJson(PROFILES_FILE, profiles, { spaces: 2 });
    console.log(`\nNA done. ${profiles.length} profiles saved.`);
}

main().catch(e => { logError(`Fatal: ${e.message}`); process.exit(1); });

