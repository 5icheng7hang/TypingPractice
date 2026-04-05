export interface Word {
	word: string;
	pinyins: string[]; // tone-marked, one per character
}

import { words2 } from './words-2.js';
import { words3 } from './words-3.js';
import { words4 } from './words-4.js';

export const allWords: Word[] = [...words2, ...words3, ...words4];

export function getSession(count: number): Word[] {
	const pool = [...allWords];
	for (let i = pool.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[pool[i], pool[j]] = [pool[j], pool[i]];
	}
	return pool.slice(0, count);
}
