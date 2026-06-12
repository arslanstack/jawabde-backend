// Punjab Assembly scraper — uses axios+cheerio (fast, no browser overhead)
// pap.gov.pk serves full HTML — no JS rendering needed
const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs-extra');
const path = require('path');

const BASE_URL = 'https://www.pap.gov.pk';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const DELAY_MS = 1200;

const DIRS = {
    photos:      path.resolve(__dirname, 'photos'),
    checkpoints: path.resolve(__dirname, 'checkpoints'),
    raw:         path.resolve(__dirname, 'raw'),
    errors:      path.resolve(__dirname, 'errors.log'),
};

const CHECKPOINT_FILE = path.join(DIRS.checkpoints, 'punjab.json');
const LIST_FILE       = path.join(DIRS.raw, 'punjab_member_list.json');
const PROFILES_FILE   = path.join(DIRS.raw, 'punjab_profiles_raw.json');

// Exclude PAP's own social links
const ASSEMBLY_FB_EXCLUDE = ['punjabassembly', 'paofpunjab', 'sharer.php', 'id=61557083872510'];

const sleep = ms => new Promise(r => setTimeout(r, ms));

function logError(msg) {
    const line = '[PUJ ' + new Date().toISOString() + '] ' + msg + '\n';
    fs.appendFileSync(DIRS.errors, line);
    console.error(line.trim());
}

async function fetchHtml(url) {
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
        await sleep(800);
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

async function getMemberList() {
    if (await fs.pathExists(LIST_FILE)) {
        console.log('Member list already exists, loading from file.');
        return fs.readJson(LIST_FILE);
    }

    const members = [];
    let pageNum = 1;

    while (true) {
        const url = pageNum === 1
            ? BASE_URL + '/members/listing/en?limit=200'
            : BASE_URL + '/members/listing/en?limit=200&page=' + pageNum;

        console.log('Fetching member list page ' + pageNum + '...');
        const html = await fetchHtml(url);
        const $ = cheerio.load(html);

        let pageCount = 0;
        $('a[href*="/members/profile/"]').each((_, el) => {
            const href = $(el).attr('href') || '';
            const fullUrl = href.startsWith('http') ? href : BASE_URL + href;
            const idMatch = fullUrl.match(/\/members\/profile\/\w+\/\w+\/(\d+)/);
            if (!idMatch) return;
            const id = idMatch[1];
            if (members.find(m => m.id === id)) return;

            let name = $(el).text().trim();
            if (!name || name.length < 3) {
                const card = $(el).closest('div, li, tr, article');
                name = card.find('h3, h4, h5, strong, b, .name').first().text().trim();
            }
            name = name.split('\n')[0].trim();

            members.push({ id, name, url: fullUrl });
            pageCount++;
        });

        if (pageCount === 0) break;
        console.log('  Page ' + pageNum + ': ' + pageCount + ' members (total: ' + members.length + ')');

        const hasNext = $('a[rel="next"], .next:not(.disabled), a[aria-label="Next"]').length > 0;
        if (!hasNext || pageNum >= 10) break;
        pageNum++;
    }

    console.log('Found ' + members.length + ' total Punjab members');
    await fs.outputJson(LIST_FILE, members, { spaces: 2 });
    return members;
}

async function scrapeProfile(member) {
    const url = BASE_URL + '/members/profile/en/22/' + member.id;
    const html = await fetchHtml(url);
    const $ = cheerio.load(html);

    // Name: h2.profile-name
    const name = $('h2.profile-name').text().trim() || member.name;

    // Code: first h4.profile-designation has "PP-117 (Faisalabad-XX)"
    let code = null;
    const desig = $('h4.profile-designation').first().text().trim();
    const codeMatch = desig.match(/PP-(\d+)/i);
    if (codeMatch) {
        code = 'PP-' + parseInt(codeMatch[1], 10);
    }
    // Fallback: from photo src mpapics/pp-117.jpg
    if (!code) {
        const photoSrc = $('img[src*="mpapics"]').attr('src') || '';
        const imgCode = photoSrc.match(/pp-(\d+)/i);
        if (imgCode) code = 'PP-' + parseInt(imgCode[1], 10);
    }

    // Photo
    let photoUrl = null;
    const mpaSrc = $('img[src*="mpapics"]').attr('src');
    if (mpaSrc) photoUrl = mpaSrc.startsWith('http') ? mpaSrc : BASE_URL + mpaSrc;

    // Party: in div.posts_text immediately after the "Party Affiliation" li
    let party = null;
    const items = $('li.list-group-item, div.posts_text').toArray();
    for (let i = 0; i < items.length - 1; i++) {
        const el = items[i];
        if ($(el).is('li') && $(el).text().trim() === 'Party Affiliation') {
            const next = items[i + 1];
            if (next && $(next).is('div.posts_text')) {
                // Remove child links to get just the party name text
                const clone = $(next).clone();
                clone.find('a').remove();
                party = clone.text().replace(/\s+/g, ' ').trim();
                if (party.length === 0 || party.length > 100) party = null;
            }
            break;
        }
    }

    // Email, phone from any text
    let email = null, phone = null, bio = null, facebook_url = null;

    $('p, td, li').each((_, el) => {
        const text = $(el).text().trim();
        if (!email && text.toLowerCase().includes('email') && text.includes('@')) {
            const m = text.match(/[\w.+\-]+@[\w.\-]+\.\w+/);
            if (m) email = m[0];
        }
        if (!phone && (text.toLowerCase().includes('phone') || text.toLowerCase().includes('mobile')) && text.match(/[\d+\-]{8,}/)) {
            const m = text.match(/[\d+\-\s]{8,}/);
            if (m) phone = m[0].replace(/\s+/g, '').trim();
        }
        if (!bio && $(el).is('p') && text.length > 120) {
            bio = text;
        }
    });

    // Facebook — exclude assembly pages and the generic share link
    $('a[href*="facebook.com"]').each((_, el) => {
        if (facebook_url) return;
        const href = $(el).attr('href') || '';
        if (!href || href === '#') return;
        if (ASSEMBLY_FB_EXCLUDE.some(p => href.includes(p))) return;
        facebook_url = href;
    });

    // Download photo
    let photo_local = null;
    if (photoUrl) {
        const ext = photoUrl.split('.').pop().split('?')[0].toLowerCase();
        const filename = 'punjab_' + member.id + '.' + (ext.match(/^(jpg|jpeg|png|webp)$/) ? ext : 'jpg');
        const destPath = path.join(DIRS.photos, filename);
        const downloaded = await downloadPhoto(photoUrl, destPath);
        if (downloaded) photo_local = 'chittar_data/enrichment/photos/' + filename;
    }

    return {
        id: member.id,
        code,
        name,
        photo_local,
        photo_url: photoUrl,
        bio,
        email,
        phone,
        party,
        facebook_url,
        source: 'pap.gov.pk',
    };
}

async function main() {
    await fs.ensureDir(DIRS.photos);
    await fs.ensureDir(DIRS.checkpoints);
    await fs.ensureDir(DIRS.raw);

    const members = await getMemberList();

    let checkpoint = { completed: [] };
    if (await fs.pathExists(CHECKPOINT_FILE)) checkpoint = await fs.readJson(CHECKPOINT_FILE);

    let profiles = [];
    if (await fs.pathExists(PROFILES_FILE)) profiles = await fs.readJson(PROFILES_FILE);

    const completedIds = new Set(checkpoint.completed);
    let newCount = 0;

    for (const member of members) {
        if (completedIds.has(member.id)) {
            console.log('  SKIP ' + member.id + ' (already done)');
            continue;
        }

        console.log('Scraping PP id:' + member.id + ' — ' + member.name);
        try {
            const profile = await scrapeProfile(member);
            console.log('  code=' + (profile.code || 'NULL') + ' party=' + (profile.party || 'NULL') + ' photo=' + (profile.photo_url ? 'yes' : 'NO'));
            profiles.push(profile);
            completedIds.add(member.id);
            newCount++;

            if (newCount % 20 === 0) {
                checkpoint.completed = [...completedIds];
                await fs.outputJson(CHECKPOINT_FILE, checkpoint, { spaces: 2 });
                await fs.outputJson(PROFILES_FILE, profiles, { spaces: 2 });
                console.log('  Checkpoint saved (' + completedIds.size + ' done)');
            }
        } catch (e) {
            logError('Failed id:' + member.id + ': ' + e.message);
        }
    }

    checkpoint.completed = [...completedIds];
    await fs.outputJson(CHECKPOINT_FILE, checkpoint, { spaces: 2 });
    await fs.outputJson(PROFILES_FILE, profiles, { spaces: 2 });
    console.log('\nPunjab done. ' + profiles.length + ' profiles saved.');
}

main().catch(e => { logError('Fatal: ' + e.message); process.exit(1); });
