const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs-extra');
const path = require('path');

const BASE_URL = 'https://www.pakp.gov.pk';
const MEMBERS_URL = `${BASE_URL}/members/`;
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const DELAY_MS = 1500;

const DIRS = {
    photos:      path.resolve(__dirname, 'photos'),
    checkpoints: path.resolve(__dirname, 'checkpoints'),
    raw:         path.resolve(__dirname, 'raw'),
    errors:      path.resolve(__dirname, 'errors.log'),
};

const CHECKPOINT_FILE = path.join(DIRS.checkpoints, 'kpk.json');
const LIST_FILE       = path.join(DIRS.raw, 'kpk_member_list.json');
const PROFILES_FILE   = path.join(DIRS.raw, 'kpk_profiles_raw.json');

// Assembly FB pages to exclude
const ASSEMBLY_FB = ['pakpgov', 'pakp.gov.pk', 'KPAssembly'];

const sleep = ms => new Promise(r => setTimeout(r, ms));

function logError(msg) {
    const line = `[KPK ${new Date().toISOString()}] ${msg}\n`;
    fs.appendFileSync(DIRS.errors, line);
    console.error(line.trim());
}

function extractCode(url) {
    const m = url.match(/-pk-(\d+)-/i);
    if (!m) return null;
    return `PK-${parseInt(m[1], 10)}`;
}

async function fetchPage(url) {
    await sleep(DELAY_MS);
    const res = await axios.get(url, {
        headers: { 'User-Agent': UA },
        timeout: 20000,
    });
    return res.data;
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

async function scrapeMemberList() {
    if (await fs.pathExists(LIST_FILE)) {
        console.log('Member list already exists, loading from file.');
        return fs.readJson(LIST_FILE);
    }

    console.log('Fetching KPK members list...');
    const html = await fetchPage(MEMBERS_URL);
    const $ = cheerio.load(html);
    const members = [];

    $('a[href*="/members/"]').each((_, el) => {
        const href = $(el).attr('href');
        if (!href) return;
        const fullUrl = href.startsWith('http') ? href : `${BASE_URL}${href}`;
        if (!fullUrl.includes('-pk-') && !fullUrl.includes('-PK-')) return;
        const code = extractCode(fullUrl);
        if (!code) return;
        if (members.find(m => m.code === code)) return;

        // Name is in the link text — may be multi-line with constituency
        const rawName = $(el).text().trim();
        const name = rawName.split('\n')[0].replace(/\t/g, '').trim();

        members.push({ url: fullUrl, name, code });
    });

    console.log(`Found ${members.length} members`);
    await fs.outputJson(LIST_FILE, members, { spaces: 2 });
    return members;
}

async function scrapeProfile(member) {
    const { url, code } = member;
    // Use name from the list (already correct, extracted from URL slug + card text)
    const listName = member.name;

    const html = await fetchPage(url);
    const $ = cheerio.load(html);

    // Photo — skip logos, banners, flags, social icons
    let photoUrl = null;
    const SKIP_PATTERNS = ['logo', 'header', 'banner', 'flag', 'social', 'facebook', 'twitter', 'instagram', 'whatsapp', 'icon'];
    $('img').each((_, img) => {
        if (photoUrl) return;
        const src = $(img).attr('src') || '';
        const lcSrc = src.toLowerCase();
        if (SKIP_PATTERNS.some(p => lcSrc.includes(p))) return;
        if (!src.match(/\.(jpg|jpeg|png|webp)/i)) return;
        photoUrl = src.startsWith('http') ? src : `${BASE_URL}${src}`;
    });

    // Party — look in tables, definition lists, and labeled paragraphs
    let party = null;
    const partyLabels = ['party', 'political party', 'affiliation'];
    $('td, th, dt, strong, b, label, span').each((_, el) => {
        if (party) return;
        const t = $(el).text().trim().toLowerCase();
        if (!partyLabels.some(l => t === l || t === l + ':')) return;
        // Value is sibling td, next sibling, or parent's next sibling
        const val = $(el).next('td,dd,span,div').text().trim()
            || $(el).closest('tr').find('td').last().text().trim()
            || $(el).parent().next().text().trim();
        if (val && val.length > 0 && val.length < 100) party = val;
    });

    // Bio — any substantial paragraph under a profile/biography heading
    let bio = null;
    $('h2, h3, h4, strong, b').each((_, el) => {
        if (bio) return;
        const t = $(el).text().trim().toLowerCase();
        if (!t.includes('profile') && !t.includes('biography') && !t.includes('about')) return;
        const next = $(el).next('p, div');
        const txt = next.text().trim();
        if (txt.length > 60) bio = txt;
    });

    // Contact fields
    let phone = null, email = null;
    $('td, th, dt, strong, b, label').each((_, el) => {
        const label = $(el).text().trim().toLowerCase();
        const val = $(el).next('td,dd,span').text().trim()
            || $(el).closest('tr').find('td').last().text().trim()
            || $(el).parent().next().text().trim();
        if (!phone && (label.includes('phone') || label.includes('mobile') || label.includes('contact'))) {
            if (val && val.match(/[\d+\-\s]{7,}/)) phone = val.replace(/\s+/g, '').trim();
        }
        if (!email && (label.includes('email') || label.includes('e-mail'))) {
            if (val && val.includes('@')) email = val.trim();
        }
    });

    // Facebook — exclude assembly pages
    let facebook_url = null;
    $('a[href*="facebook.com"]').each((_, el) => {
        if (facebook_url) return;
        const href = $(el).attr('href') || '';
        if (ASSEMBLY_FB.some(p => href.includes(p))) return;
        facebook_url = href;
    });

    // Download photo
    let photo_local = null;
    if (photoUrl) {
        const ext = photoUrl.split('.').pop().split('?')[0].toLowerCase();
        const filename = `kpk_${code.toLowerCase()}.${ext.match(/^(jpg|jpeg|png|webp)$/) ? ext : 'jpg'}`;
        const destPath = path.join(DIRS.photos, filename);
        photo_local = await downloadPhoto(photoUrl, destPath);
        if (photo_local) {
            photo_local = 'chittar_data/enrichment/photos/' + filename;
        }
    }

    return {
        code,
        name: listName,
        photo_local,
        photo_url: photoUrl,
        bio,
        email,
        phone,
        party,
        facebook_url,
        source: 'pakp.gov.pk',
    };
}

async function main() {
    await fs.ensureDir(DIRS.photos);
    await fs.ensureDir(DIRS.checkpoints);
    await fs.ensureDir(DIRS.raw);

    const members = await scrapeMemberList();

    let checkpoint = { completed: [] };
    if (await fs.pathExists(CHECKPOINT_FILE)) checkpoint = await fs.readJson(CHECKPOINT_FILE);

    let profiles = [];
    if (await fs.pathExists(PROFILES_FILE)) profiles = await fs.readJson(PROFILES_FILE);

    const completedCodes = new Set(checkpoint.completed);
    let newCount = 0;

    for (const member of members) {
        if (completedCodes.has(member.code)) {
            console.log(`  SKIP ${member.code} (already done)`);
            continue;
        }

        console.log(`Scraping ${member.code} — ${member.name}`);
        try {
            const profile = await scrapeProfile(member);
            profiles.push(profile);
            completedCodes.add(member.code);
            newCount++;

            if (newCount % 10 === 0) {
                checkpoint.completed = [...completedCodes];
                await fs.outputJson(CHECKPOINT_FILE, checkpoint, { spaces: 2 });
                await fs.outputJson(PROFILES_FILE, profiles, { spaces: 2 });
                console.log(`  Checkpoint saved (${completedCodes.size} done)`);
            }
        } catch (e) {
            logError(`Failed ${member.code} ${member.url}: ${e.message}`);
        }
    }

    checkpoint.completed = [...completedCodes];
    await fs.outputJson(CHECKPOINT_FILE, checkpoint, { spaces: 2 });
    await fs.outputJson(PROFILES_FILE, profiles, { spaces: 2 });
    console.log(`\nKPK done. ${profiles.length} profiles saved.`);
}

main().catch(e => { logError(`Fatal: ${e.message}`); process.exit(1); });
