<script lang="ts">
	import type { EpubBook } from '$lib/epub-parser.js';
	import { buildSlots, type Slot } from '$lib/ebook-stream.js';
	import { saveProgress } from '$lib/epub-store.js';
	import { pinyin } from 'pinyin-pro';

	let { book, bookId, startChapter, startParagraph, onback } = $props<{
		book: EpubBook;
		bookId: string;
		startChapter: number;
		startParagraph: number;
		onback: () => void;
	}>();

	// svelte-ignore state_referenced_locally
	let chapterIdx = $state(startChapter);
	// svelte-ignore state_referenced_locally
	let paragraphIdx = $state(startParagraph);
	let slotIdx = $state(0);
	let results = $state<('correct' | 'wrong' | null)[]>([]);
	let typedKeys = $state<(string | null)[]>([]);
	let startTime = $state<number | null>(null);
	let elapsed = $state(0);
	let totalCorrect = $state(0);
	let totalTyped = $state(0);
	let paragraphComplete = $state(false);
	let completedParagraphs = $state<Set<string>>(new Set());
	let inputEl = $state<HTMLInputElement | null>(null);
	let timerInterval: ReturnType<typeof setInterval> | null = null;

	const currentChapter = $derived(book.chapters[chapterIdx]);
	const currentParagraph = $derived(currentChapter?.paragraphs[paragraphIdx] ?? '');
	const slots = $derived(buildSlots(currentParagraph));
	const accuracy = $derived(totalTyped > 0 ? Math.round((totalCorrect / totalTyped) * 100) : 100);
	const cpm = $derived(elapsed > 0 ? Math.round((totalTyped * 60) / elapsed) : 0);

	const mm = $derived(String(Math.floor(elapsed / 60)).padStart(2, '0'));
	const ss = $derived(String(elapsed % 60).padStart(2, '0'));

	const charStates = $derived(buildCharStates(currentParagraph, slots, slotIdx, results));

	// The charIndex of the currently active slot (for scrolling)
	const activeCharIndex = $derived(slotIdx < slots.length ? slots[slotIdx].charIndex : -1);

	// Build per-character pinyin map: charIndex → pinyin string (only for Chinese chars)
	const charPinyins = $derived(buildCharPinyins(currentParagraph));

	function buildCharPinyins(paragraph: string): Map<number, string> {
		const map = new Map<number, string>();
		for (let i = 0; i < paragraph.length; i++) {
			const code = paragraph.codePointAt(i)!;
			if ((code >= 0x4e00 && code <= 0x9fff) || (code >= 0x3400 && code <= 0x4dbf)) {
				const py = pinyin(paragraph[i], { toneType: 'symbol', v: true });
				map.set(i, py);
			}
		}
		return map;
	}

	// Per-letter pinyin display info for each Chinese character
	interface PinyinLetterInfo {
		displayChar: string;
		status: 'correct' | 'wrong' | 'active' | 'pending';
	}

	const charPinyinLetters = $derived(
		buildCharPinyinLetters(currentParagraph, slots, slotIdx, results, typedKeys, charPinyins)
	);

	function buildCharPinyinLetters(
		paragraph: string,
		sl: Slot[],
		currentSlotIdx: number,
		res: ('correct' | 'wrong' | null)[],
		typed: (string | null)[],
		pinyinMap: Map<number, string>
	): Map<number, PinyinLetterInfo[]> {
		const map = new Map<number, PinyinLetterInfo[]>();
		for (let ci = 0; ci < paragraph.length; ci++) {
			const tonedPinyin = pinyinMap.get(ci);
			if (!tonedPinyin) continue;

			// Find all pinyin-letter slots for this character
			const letterSlots: number[] = [];
			for (let si = 0; si < sl.length; si++) {
				if (sl[si].charIndex === ci && sl[si].kind === 'pinyin-letter') {
					letterSlots.push(si);
				}
			}
			if (letterSlots.length === 0) continue;

			const letters: PinyinLetterInfo[] = [];
			const tonedChars = Array.from(tonedPinyin);

			for (let li = 0; li < letterSlots.length; li++) {
				const si = letterSlots[li];
				const tonedChar = tonedChars[li] ?? sl[si].key;
				const result = res[si];
				const typedKey = typed[si];

				if (result === null) {
					if (si === currentSlotIdx) {
						letters.push({ displayChar: tonedChar, status: 'active' });
					} else {
						letters.push({ displayChar: tonedChar, status: 'pending' });
					}
				} else if (result === 'correct') {
					letters.push({ displayChar: tonedChar, status: 'correct' });
				} else {
					// wrong: show what user actually typed
					letters.push({ displayChar: typedKey ?? '?', status: 'wrong' });
				}
			}

			map.set(ci, letters);
		}
		return map;
	}

	function buildCharStates(
		paragraph: string,
		sl: Slot[],
		currentSlotIdx: number,
		res: ('correct' | 'wrong' | null)[]
	): ('correct' | 'wrong' | 'active' | 'pending' | 'auto-skip')[] {
		const states: ('correct' | 'wrong' | 'active' | 'pending' | 'auto-skip')[] = [];

		for (let ci = 0; ci < paragraph.length; ci++) {
			// Find all slots with this charIndex
			const charSlots: number[] = [];
			for (let si = 0; si < sl.length; si++) {
				if (sl[si].charIndex === ci) {
					charSlots.push(si);
				}
			}

			if (charSlots.length === 0) {
				states.push('pending');
				continue;
			}

			// Check if all are auto-skip
			const allAutoSkip = charSlots.every((si) => sl[si].kind === 'auto-skip');
			if (allAutoSkip) {
				states.push('auto-skip');
				continue;
			}

			// Check if slotIdx falls within this char's slot range
			const minSlot = charSlots[0];
			const maxSlot = charSlots[charSlots.length - 1];
			if (currentSlotIdx >= minSlot && currentSlotIdx <= maxSlot) {
				states.push('active');
				continue;
			}

			// Check if all slots are done
			const allDone = charSlots.every((si) => res[si] !== null);
			if (allDone) {
				const anyWrong = charSlots.some((si) => res[si] === 'wrong');
				states.push(anyWrong ? 'wrong' : 'correct');
				continue;
			}

			states.push('pending');
		}

		return states;
	}

	// Reset when paragraph changes
	$effect(() => {
		// Reference currentParagraph to track dependency
		const _p = currentParagraph;
		if (!_p) return;

		const freshSlots = buildSlots(_p);
		const freshResults: ('correct' | 'wrong' | null)[] = Array(freshSlots.length).fill(null);
		const freshTypedKeys: (string | null)[] = Array(freshSlots.length).fill(null);

		// Skip auto slots at the start (inline to avoid reading slotIdx as dependency)
		let startIdx = 0;
		while (startIdx < freshSlots.length && freshSlots[startIdx].kind === 'auto-skip') {
			freshResults[startIdx] = 'correct';
			startIdx++;
		}

		slotIdx = startIdx;
		results = freshResults;
		typedKeys = freshTypedKeys;
		paragraphComplete = startIdx >= freshSlots.length;
	});

	// Focus hidden input
	$effect(() => {
		inputEl?.focus();
	});

	// Scroll active character into view (centered)
	$effect(() => {
		const ci = activeCharIndex;
		if (ci < 0) return;
		// Use tick to ensure DOM is updated
		const el = document.querySelector('[data-active-char]');
		if (el) {
			el.scrollIntoView({ block: 'center', behavior: 'smooth' });
		}
	});

	// Timer
	$effect(() => {
		timerInterval = setInterval(() => {
			if (startTime !== null) {
				elapsed = Math.floor((Date.now() - startTime) / 1000);
			}
		}, 500);

		return () => {
			if (timerInterval) {
				clearInterval(timerInterval);
				timerInterval = null;
			}
		};
	});

	function skipAutoSlots() {
		while (slotIdx < slots.length && slots[slotIdx].kind === 'auto-skip') {
			results[slotIdx] = 'correct';
			slotIdx++;
		}
	}

	function startTimer() {
		if (startTime !== null) return;
		startTime = Date.now();
	}

	function stopTimer() {
		// Timer keeps running via interval; we just mark the time
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter' && paragraphComplete) {
			e.preventDefault();
			// Advance to next paragraph or chapter
			const key = chapterIdx + '-' + paragraphIdx;
			completedParagraphs = new Set([...completedParagraphs, key]);

			if (paragraphIdx + 1 < currentChapter.paragraphs.length) {
				paragraphIdx++;
			} else if (chapterIdx + 1 < book.chapters.length) {
				chapterIdx++;
				paragraphIdx = 0;
			}

			saveProgress({ bookId, chapterIndex: chapterIdx, paragraphIndex: paragraphIdx });
			return;
		}

		if (e.key === 'Backspace') {
			e.preventDefault();
			if (slotIdx <= 0) return;

			// Go back one slot, skipping over auto-skip slots
			slotIdx--;
			while (slotIdx > 0 && slots[slotIdx].kind === 'auto-skip') {
				slotIdx--;
			}

			// Undo stats for the slot we're going back to
			if (results[slotIdx] !== null) {
				totalTyped--;
				if (results[slotIdx] === 'correct') totalCorrect--;
				results[slotIdx] = null;
				typedKeys[slotIdx] = null;
			}

			// Also clear any auto-skip slots after current position
			for (let i = slotIdx + 1; i < slots.length; i++) {
				if (slots[i].kind === 'auto-skip' && results[i] === 'correct') {
					results[i] = null;
				} else if (slots[i].kind !== 'auto-skip') {
					break;
				}
			}

			paragraphComplete = false;
			return;
		}

		if (paragraphComplete) return;

		// Ignore space key and non-printable keys
		if (e.key === ' ') { e.preventDefault(); return; }
		if (e.key.length !== 1) return;

		e.preventDefault();

		startTimer();

		const typed = e.key.toLowerCase();
		const slot = slots[slotIdx];
		const isCorrect = typed === slot.key;

		typedKeys[slotIdx] = typed;
		results[slotIdx] = isCorrect ? 'correct' : 'wrong';
		totalTyped++;
		if (isCorrect) totalCorrect++;

		slotIdx++;
		skipAutoSlots();

		if (slotIdx >= slots.length) {
			paragraphComplete = true;
		}
	}

	function jumpToParagraph(pi: number) {
		paragraphIdx = pi;
	}

	function charStateClass(ci: number): string {
		return 'char char-' + charStates[ci];
	}
</script>

<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
<div class="ebook-practice">
	<aside class="sidebar">
		<div class="sidebar-header">
			<button class="back-btn" onclick={onback}>← 目录</button>
			<span class="chapter-title">{currentChapter?.title ?? ''}</span>
		</div>
		<div class="paragraph-list">
			{#each currentChapter?.paragraphs ?? [] as para, pi}
				<button
					class="para-item"
					class:active={pi === paragraphIdx}
					class:completed={completedParagraphs.has(chapterIdx + '-' + pi)}
					onclick={() => jumpToParagraph(pi)}
				>
					<span class="para-num">{pi + 1}</span>
					<span class="para-preview"
						>{para.slice(0, 40)}{para.length > 40 ? '...' : ''}</span
					>
				</button>
			{/each}
		</div>
	</aside>

	<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
	<div class="main-area" onclick={() => inputEl?.focus()}>
		<!-- Stats bar -->
		<div class="ebook-stats">
			<div class="stat">
				<span class="value">{cpm}</span><span class="label">字/分</span>
			</div>
			<div class="stat">
				<span class="value">{accuracy}%</span><span class="label">准确率</span>
			</div>
			<div class="stat">
				<span class="value">{mm}:{ss}</span><span class="label">用时</span>
			</div>
			<div class="stat progress">
				<span class="value"
					>{paragraphIdx + 1}/{currentChapter?.paragraphs.length ?? 0}</span
				><span class="label">段落</span>
			</div>
		</div>

		<!-- Text display with ruby pinyin annotations (per-letter feedback) -->
		<div class="text-display">
			{#each currentParagraph.split('') as char, ci}
				{#if charPinyinLetters.has(ci)}
					<ruby class={charStateClass(ci)} data-active-char={ci === activeCharIndex ? '' : undefined}>{char}<rp>(</rp><rt class="pinyin-rt">{#each charPinyinLetters.get(ci) ?? [] as info}<span class="py-{info.status}">{info.displayChar}</span>{/each}</rt><rp>)</rp></ruby>
				{:else}
					<span class={charStateClass(ci)} data-active-char={ci === activeCharIndex ? '' : undefined}>{char}</span>
				{/if}
			{/each}
		</div>

		<!-- Prompt -->
		<div class="prompt" class:visible={paragraphComplete}>
			<kbd>Enter</kbd> 继续下一段
		</div>

		<input
			bind:this={inputEl}
			class="hidden-input"
			type="text"
			autocomplete="off"
			autocorrect="off"
			autocapitalize="off"
			spellcheck={false}
			onkeydown={handleKeydown}
			aria-label="输入拼音"
		/>
		<p class="tip">点击此处聚焦 · 逐字输入拼音</p>
	</div>
</div>

<style>
	.ebook-practice {
		display: flex;
		flex: 1;
		height: 100%;
	}

	.sidebar {
		width: 250px;
		border-right: 1px solid var(--border);
		background: var(--surface);
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.sidebar-header {
		padding: 0.75rem 1rem;
		border-bottom: 1px solid var(--border);
	}

	.back-btn {
		background: none;
		border: none;
		color: var(--text-muted);
		cursor: pointer;
		font-size: 0.85rem;
		padding: 0.25rem 0;
		font-family: var(--font-ui);
	}

	.back-btn:hover {
		color: var(--text);
	}

	.chapter-title {
		display: block;
		font-family: var(--font-zh);
		font-size: 0.9rem;
		font-weight: 600;
		color: var(--text);
		margin-top: 0.5rem;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.paragraph-list {
		flex: 1;
		overflow-y: auto;
	}

	.para-item {
		display: flex;
		align-items: baseline;
		gap: 0.5rem;
		width: 100%;
		text-align: left;
		padding: 0.5rem 1rem;
		border: none;
		border-bottom: 1px solid var(--border);
		background: transparent;
		cursor: pointer;
		color: var(--text);
		font-size: 0.8rem;
		font-family: var(--font-zh);
		transition: background var(--transition);
	}

	.para-item:hover {
		background: var(--accent-light);
	}

	.para-item.active {
		background: var(--accent-light);
		border-left: 3px solid var(--accent);
	}

	.para-item.completed {
		color: var(--text-muted);
	}

	.para-num {
		color: var(--text-muted);
		font-size: 0.75rem;
		flex-shrink: 0;
	}

	.para-preview {
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.main-area {
		flex: 1;
		display: flex;
		flex-direction: column;
		padding: 0;
	}

	.ebook-stats {
		display: flex;
		align-items: center;
		gap: 2rem;
		padding: 0.75rem 1.5rem;
		background: var(--surface);
		border-bottom: 1px solid var(--border);
	}

	.stat {
		display: flex;
		align-items: baseline;
		gap: 0.4rem;
	}

	.stat .value {
		font-size: 1.25rem;
		font-weight: 600;
		color: var(--text);
		font-variant-numeric: tabular-nums;
	}

	.stat .label {
		font-size: 0.75rem;
		color: var(--text-muted);
	}

	.stat.progress {
		margin-left: auto;
	}

	.text-display {
		padding: 2rem;
		font-family: var(--font-zh);
		font-size: 4.5rem;
		line-height: 3;
		flex: 1;
		overflow-y: auto;
	}

	.pinyin-rt {
		font-family: var(--font-ui);
		font-size: 0.55em;
		font-weight: 500;
		letter-spacing: 0.02em;
	}

	.pinyin-rt :global(.py-pending) {
		color: var(--text-muted);
	}

	.pinyin-rt :global(.py-active) {
		color: var(--accent);
		font-weight: 700;
		text-decoration: underline;
		text-underline-offset: 2px;
	}

	.pinyin-rt :global(.py-correct) {
		color: var(--success);
	}

	.pinyin-rt :global(.py-wrong) {
		color: var(--error);
		font-weight: 700;
	}

	.char {
		transition: color 100ms ease;
	}

	:global(.char-correct) {
		color: var(--success);
	}

	:global(.char-wrong) {
		color: var(--error);
	}

	:global(.char-active) {
		background: var(--accent-light);
		border-bottom: 2px solid var(--accent);
		border-radius: 2px;
	}

	:global(.char-pending) {
		color: var(--text);
	}

	:global(.char-auto-skip) {
		color: var(--text-muted);
	}

	.prompt {
		height: 2rem;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		font-size: 0.85rem;
		color: var(--text-muted);
		opacity: 0;
		transition: opacity 200ms ease;
	}

	.prompt.visible {
		opacity: 1;
	}

	kbd {
		display: inline-flex;
		align-items: center;
		padding: 0.15rem 0.5rem;
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		background: var(--surface);
		font-family: var(--font-ui);
		font-size: 0.8rem;
		color: var(--accent);
		line-height: 1.4;
	}

	.hidden-input {
		position: absolute;
		opacity: 0;
		pointer-events: none;
		width: 1px;
		height: 1px;
	}

	.tip {
		text-align: center;
		font-size: 0.78rem;
		color: var(--text-muted);
		padding: 0.5rem;
	}
</style>
