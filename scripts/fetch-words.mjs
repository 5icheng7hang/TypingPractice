/**
 * fetch-words.mjs
 * Downloads a Chinese word frequency list + CC-CEDICT dictionary,
 * filters out proper nouns (foreign names, place names),
 * converts to pinyin via pinyin-pro, and writes src/lib/words-2/3/4.ts.
 *
 * Usage: npm run fetch-words
 */

import { pinyin } from 'pinyin-pro';
import { gunzipSync } from 'zlib';
import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const FREQ_URLS = [
	'https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/zh/zh_50k.txt',
	'https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2016/zh/zh_50k.txt',
	'https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2018/zh_50k/zh_50k.txt',
	'https://raw.githubusercontent.com/hermitdave/FrequencyWords/main/content/2018/zh/zh_50k.txt',
];

// Official CC-CEDICT download (gzipped)
const CEDICT_URL = 'https://www.mdbg.net/chinese/export/cedict/cedict_1_0_ts_utf-8_mdbg.txt.gz';

const LIMITS = { 2: 1500, 3: 800, 4: 500 };
const CJK_ONLY = /^[\u4e00-\u9fff]+$/;

// ─── Fetchers ──────────────────────────────────────────────────────────────

async function fetchFrequencyList() {
	for (const url of FREQ_URLS) {
		console.log(`📥 Trying frequency list: ${url}`);
		try {
			const res = await fetch(url);
			if (res.ok) { console.log('   ✅ Got it!'); return res.text(); }
			console.log(`   HTTP ${res.status} — trying next...`);
		} catch { console.log('   Network error — trying next...'); }
	}
	throw new Error('All frequency list URLs failed.');
}

async function fetchCEDICT() {
	console.log(`📥 Fetching CC-CEDICT dictionary...`);
	const res = await fetch(CEDICT_URL);
	if (!res.ok) throw new Error(`CC-CEDICT HTTP ${res.status}`);
	const buffer = await res.arrayBuffer();
	console.log('   ✅ Decompressing...');
	return gunzipSync(Buffer.from(buffer)).toString('utf-8');
}

// ─── Parsers ───────────────────────────────────────────────────────────────

function parseFreqList(text) {
	return text.split('\n').map(l => l.trim().split(/\s+/)[0]).filter(Boolean);
}

/**
 * Parse CC-CEDICT and return a Set of valid simplified Chinese words.
 * Proper nouns are identified by capital letters in the pinyin field,
 * which is the CC-CEDICT convention for all proper nouns (names, places, etc.)
 */
function parseCEDICT(text) {
	const valid = new Set();
	for (const line of text.split('\n')) {
		if (line.startsWith('#') || !line.trim()) continue;
		// Format: simplified traditional [pin1 yin1] /defs/
		const m = line.match(/^(\S+) \S+ \[([^\]]+)\]/);
		if (!m) continue;
		const [, simplified, pinyinField] = m;
		const len = [...simplified].length;
		if (len < 2 || len > 4) continue;
		if (!CJK_ONLY.test(simplified)) continue;
		// CC-CEDICT uses capital letters for proper nouns — skip them
		if (/[A-Z]/.test(pinyinField)) continue;
		valid.add(simplified);
	}
	console.log(`   ✅ ${valid.size} valid common words extracted from CC-CEDICT`);
	return valid;
}

// ─── Pinyin conversion ─────────────────────────────────────────────────────

function toPinyinArray(word) {
	try {
		const result = pinyin(word, { toneType: 'symbol', type: 'array', nonZh: 'removed' });
		return result.length === [...word].length ? result : null;
	} catch { return null; }
}

// ─── Output ────────────────────────────────────────────────────────────────

function renderTsFile(varName, entries) {
	const lines = entries.map(({ word, pinyins }) => {
		const pyStr = pinyins.map(p => `'${p}'`).join(', ');
		return `\t{ word: '${word}', pinyins: [${pyStr}] },`;
	});
	return [`import type { Word } from './words.js';`, ``, `export const ${varName}: Word[] = [`, ...lines, `];`, ``].join('\n');
}

// ─── Main ──────────────────────────────────────────────────────────────────

async function main() {
	const [freqText, cedictText] = await Promise.all([fetchFrequencyList(), fetchCEDICT()]);

	const freqWords = parseFreqList(freqText);
	console.log(`\n📊 Frequency list: ${freqWords.length} entries`);

	const validWords = parseCEDICT(cedictText);

	const buckets = { 2: [], 3: [], 4: [] };

	for (const word of freqWords) {
		const len = [...word].length;
		if (len < 2 || len > 4) continue;
		if (!CJK_ONLY.test(word)) continue;
		if (!validWords.has(word)) continue; // not in CEDICT or is a proper noun
		if (buckets[len].length >= LIMITS[len]) continue;

		const pinyins = toPinyinArray(word);
		if (!pinyins) continue;

		buckets[len].push({ word, pinyins });
	}

	console.log('');
	for (const [len, entries] of Object.entries(buckets)) {
		const outPath = join(__dirname, `../src/lib/words-${len}.ts`);
		writeFileSync(outPath, renderTsFile(`words${len}`, entries), 'utf-8');
		console.log(`✍️  words-${len}.ts — ${entries.length} words`);
	}

	const total = Object.values(buckets).reduce((s, b) => s + b.length, 0);
	console.log(`\n🎉 Done! ${total} words total (no proper nouns).`);
}

main().catch(err => { console.error('❌', err.message); process.exit(1); });

