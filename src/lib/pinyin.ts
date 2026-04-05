export function stripTones(pinyin: string): string {
	// ü variants must be replaced with 'v' BEFORE NFD normalization,
	// because NFD decomposes ü → u + combining diaeresis which then gets
	// stripped as a diacritic, silently producing 'u' instead of 'v'.
	// Chinese IME convention: ü is typed as 'v' (Sogou, Baidu, etc.)
	return pinyin
		.replace(/[ǖǘǚǜü]/g, 'v')
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase();
}

/** Split a word's flat pinyin array into individual typeable syllables */
export function toTypeable(pinyins: string[]): string[] {
	return pinyins.map(stripTones);
}
