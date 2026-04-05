import { pinyin } from 'pinyin-pro';

export type SlotKind = 'pinyin-letter' | 'punctuation' | 'digit' | 'alpha' | 'auto-skip';

export interface Slot {
	key: string;
	kind: SlotKind;
	charIndex: number;
	pinyinIndex?: number;
	pinyinLength?: number;
}

const FULLWIDTH_PUNCT_MAP: Record<string, string> = {
	'，': ',',
	'。': '.',
	'？': '?',
	'！': '!',
	'：': ':',
	'；': ';'
};

const TYPEABLE_PUNCT = new Set([',', '.', '?', '!', ':', ';']);

function isChinese(char: string): boolean {
	const code = char.codePointAt(0)!;
	return (code >= 0x4e00 && code <= 0x9fff) || (code >= 0x3400 && code <= 0x4dbf);
}

function isDigit(char: string): boolean {
	const code = char.charCodeAt(0);
	return (code >= 0x30 && code <= 0x39) || (code >= 0xff10 && code <= 0xff19);
}

function isAlpha(char: string): boolean {
	const code = char.charCodeAt(0);
	return (
		(code >= 0x41 && code <= 0x5a) ||
		(code >= 0x61 && code <= 0x7a) ||
		(code >= 0xff21 && code <= 0xff3a) ||
		(code >= 0xff41 && code <= 0xff5a)
	);
}

function normalizeDigit(char: string): string {
	const code = char.charCodeAt(0);
	if (code >= 0xff10 && code <= 0xff19) {
		return String.fromCharCode(code - 0xff10 + 0x30);
	}
	return char;
}

function normalizeAlpha(char: string): string {
	const code = char.charCodeAt(0);
	// Fullwidth uppercase A-Z
	if (code >= 0xff21 && code <= 0xff3a) {
		return String.fromCharCode(code - 0xff21 + 0x61);
	}
	// Fullwidth lowercase a-z
	if (code >= 0xff41 && code <= 0xff5a) {
		return String.fromCharCode(code - 0xff41 + 0x61);
	}
	return char.toLowerCase();
}

export function buildSlots(paragraph: string): Slot[] {
	const slots: Slot[] = [];

	for (let i = 0; i < paragraph.length; i++) {
		const char = paragraph[i];

		if (isChinese(char)) {
			const py = pinyin(char, { toneType: 'none', v: true }).toLowerCase();
			for (let j = 0; j < py.length; j++) {
				slots.push({
					key: py[j],
					kind: 'pinyin-letter',
					charIndex: i,
					pinyinIndex: j,
					pinyinLength: py.length
				});
			}
		} else if (char in FULLWIDTH_PUNCT_MAP) {
			slots.push({
				key: FULLWIDTH_PUNCT_MAP[char],
				kind: 'punctuation',
				charIndex: i
			});
		} else if (TYPEABLE_PUNCT.has(char)) {
			slots.push({
				key: char,
				kind: 'punctuation',
				charIndex: i
			});
		} else if (isDigit(char)) {
			slots.push({
				key: normalizeDigit(char),
				kind: 'digit',
				charIndex: i
			});
		} else if (isAlpha(char)) {
			slots.push({
				key: normalizeAlpha(char),
				kind: 'alpha',
				charIndex: i
			});
		} else {
			slots.push({
				key: '',
				kind: 'auto-skip',
				charIndex: i
			});
		}
	}

	return slots;
}
