// Task 6: Build master enrichment map from all 5 raw scraped files
// Matches each scraped profile to a constituency code in our DB data

const fs = require('fs-extra');
const path = require('path');

const BASE = path.resolve(__dirname, '..');

const FILES = {
    mnas:        path.join(BASE, 'politicians', 'mnas.json'),
    mpas:        path.join(BASE, 'politicians', 'all_mpas.json'),
    kpk:         path.join(__dirname, 'raw', 'kpk_profiles_raw.json'),
    balochistan: path.join(__dirname, 'raw', 'balochistan_profiles_raw.json'),
    punjab:      path.join(__dirname, 'raw', 'punjab_profiles_raw.json'),
    sindh:       path.join(__dirname, 'raw', 'sindh_profiles_raw.json'),
    na:          path.join(__dirname, 'raw', 'na_profiles_raw.json'),
    output:      path.join(__dirname, 'enrichment_map.json'),
    unmatched:   path.join(__dirname, 'unmatched.json'),
    no_data:     path.join(__dirname, 'no_data_found.json'),
};

function stripTitles(name) {
    return (name || '')
        .replace(/^(Syed|Mian|Ch\.|Chaudhry|Chaudhary|Dr\.|Raja|Rana|Malik|Hafiz|Maulana|Sheikh|Sardar|Mr\.|Ms\.|Mrs\.|Begum|Bibi|Haji|Pir|Mir|Khan|Lt\.|Col\.|Brig\.|Gen\.|Nawab|Nawabzada|Molvi|Moulana|Capt|Engineer|Prince)\s+/gi, '')
        .trim()
        .toLowerCase();
}

function lastTwoWords(name) {
    const words = stripTitles(name).split(/\s+/).filter(Boolean);
    return words.length >= 2 ? words.slice(-2).join(' ') : stripTitles(name);
}

function normalizeCode(code) {
    if (!code) return null;
    return code.toUpperCase().trim();
}

function buildEntry(profile, method) {
    return {
        photo_local_path: profile.photo_local || null,
        photo_url:        profile.photo_url || null,
        bio:              profile.bio || null,
        email:            profile.email || null,
        phone:            profile.phone || null,
        facebook_url:     profile.facebook_url || null,
        source:           profile.source || null,
        match_method:     method,
    };
}

async function main() {
    // Load all source data
    const mnas = await fs.readJson(FILES.mnas);
    const mpas = await fs.readJson(FILES.mpas);

    // Build set of all constituency codes in our DB
    const allCodes = new Set();
    const codeToName = {}; // code -> member_name for fuzzy matching
    for (const m of mnas) {
        const code = normalizeCode(m.constituency_code);
        if (code) { allCodes.add(code); codeToName[code] = m.member_name; }
    }
    for (const m of mpas) {
        const code = normalizeCode(m.constituency_code);
        if (code) { allCodes.add(code); codeToName[code] = m.member_name; }
    }
    console.log('Total constituency codes in DB:', allCodes.size);

    // Load all scraped profiles
    const scraped = [];
    const assemblies = ['kpk', 'balochistan', 'punjab', 'sindh', 'na'];
    for (const key of assemblies) {
        if (await fs.pathExists(FILES[key])) {
            const profiles = await fs.readJson(FILES[key]);
            scraped.push(...profiles);
            console.log(key + ': loaded ' + profiles.length + ' profiles');
        } else {
            console.log(key + ': file not found, skipping');
        }
    }
    console.log('Total scraped profiles:', scraped.length);

    const enrichmentMap = {};  // code -> entry
    const unmatched = [];      // scraped profiles that couldn't be matched
    const matchCounts = { code: 0, exact_name: 0, fuzzy_name: 0 };

    // Build name lookup from DB for name-based fallback matching
    // name_lower -> code
    const nameToCode = {};
    const last2ToCode = {};
    for (const [code, name] of Object.entries(codeToName)) {
        const nl = (name || '').toLowerCase().trim();
        if (nl) {
            if (!nameToCode[nl]) nameToCode[nl] = code;
        }
        const l2 = lastTwoWords(name);
        if (l2 && l2.length > 3) {
            if (!last2ToCode[l2]) last2ToCode[l2] = code;
        }
    }

    for (const profile of scraped) {
        // Skip if no meaningful data
        if (!profile.name && !profile.code) { unmatched.push(profile); continue; }

        let matchedCode = null;
        let method = null;

        // 1. Constituency code match
        const profileCode = normalizeCode(profile.code);
        if (profileCode && allCodes.has(profileCode)) {
            matchedCode = profileCode;
            method = 'constituency_code';
        }

        // 2. Exact name match
        if (!matchedCode && profile.name) {
            const nl = profile.name.toLowerCase().trim();
            if (nameToCode[nl]) {
                matchedCode = nameToCode[nl];
                method = 'exact_name';
            }
        }

        // 3. Fuzzy name match (strip titles, last 2 words)
        if (!matchedCode && profile.name) {
            const stripped = stripTitles(profile.name);
            // Try stripped exact
            if (nameToCode[stripped]) {
                matchedCode = nameToCode[stripped];
                method = 'fuzzy_name';
            } else {
                // Try last 2 words
                const l2 = lastTwoWords(profile.name);
                if (l2 && l2.length > 3 && last2ToCode[l2]) {
                    matchedCode = last2ToCode[l2];
                    method = 'fuzzy_name';
                }
            }
        }

        if (!matchedCode) {
            unmatched.push({ ...profile, _reason: 'no_code_or_name_match' });
            continue;
        }

        // If we already have an entry for this code, merge (prefer non-null fields)
        if (enrichmentMap[matchedCode]) {
            const existing = enrichmentMap[matchedCode];
            // Only overwrite null fields (don't downgrade existing data)
            if (!existing.photo_local_path && profile.photo_local) existing.photo_local_path = profile.photo_local;
            if (!existing.photo_url && profile.photo_url) existing.photo_url = profile.photo_url;
            if (!existing.bio && profile.bio) existing.bio = profile.bio;
            if (!existing.email && profile.email) existing.email = profile.email;
            if (!existing.phone && profile.phone) existing.phone = profile.phone;
            if (!existing.facebook_url && profile.facebook_url) existing.facebook_url = profile.facebook_url;
        } else {
            enrichmentMap[matchedCode] = buildEntry(profile, method);
            matchCounts[method === 'constituency_code' ? 'code' : method === 'exact_name' ? 'exact_name' : 'fuzzy_name']++;
        }
    }

    // Find codes with no data
    const noDataFound = [];
    for (const code of allCodes) {
        if (!enrichmentMap[code]) {
            noDataFound.push({ code, name: codeToName[code] });
        }
    }

    // Save outputs
    await fs.outputJson(FILES.output, enrichmentMap, { spaces: 2 });
    await fs.outputJson(FILES.unmatched, unmatched, { spaces: 2 });
    await fs.outputJson(FILES.no_data, noDataFound, { spaces: 2 });

    // Stats
    const total = Object.keys(enrichmentMap).length;
    const withPhoto   = Object.values(enrichmentMap).filter(e => e.photo_local_path).length;
    const withBio     = Object.values(enrichmentMap).filter(e => e.bio).length;
    const withEmail   = Object.values(enrichmentMap).filter(e => e.email).length;
    const withPhone   = Object.values(enrichmentMap).filter(e => e.phone).length;
    const withFB      = Object.values(enrichmentMap).filter(e => e.facebook_url).length;

    console.log('\n=== ENRICHMENT MAP BUILT ===');
    console.log('Matched politicians:', total, '/', allCodes.size);
    console.log('  By code:       ', matchCounts.code);
    console.log('  By exact name: ', matchCounts.exact_name);
    console.log('  By fuzzy name: ', matchCounts.fuzzy_name);
    console.log('Unmatched scraped:', unmatched.length);
    console.log('No data found:   ', noDataFound.length);
    console.log('\nCoverage:');
    console.log('  Photos:   ', withPhoto);
    console.log('  Bio:      ', withBio);
    console.log('  Email:    ', withEmail);
    console.log('  Phone:    ', withPhone);
    console.log('  Facebook: ', withFB);
    console.log('\nOutput: chittar_data/enrichment/enrichment_map.json');
}

main().catch(e => { console.error('Fatal:', e.message); process.exit(1); });
