<script lang="ts">
	import { getSession, type Word } from '$lib/words.js';
	import { stripTones } from '$lib/pinyin.js';
	import StatsBar from './StatsBar.svelte';
	import CharacterTile from './CharacterTile.svelte';

	const SESSION_SIZE = 30;

	let { ondone } = $props<{
		ondone: (result: { wpm: number; accuracy: number; elapsed: number; correct: number; wrong: number }) => void;
	}>();

	let words = $state<Word[]>(getSession(SESSION_SIZE));

	// Current position
	let wordIdx = $state(0);
	let charIdx = $state(0);
	let currentTyped = $state('');
	let charStates = $state<('done-correct' | 'done-wrong' | null)[]>(
		Array(words[0]?.word.length ?? 0).fill(null)
	);

	// 'typing'    — actively typing current char
	// 'word-done' — word complete, waiting for Space to advance
	type Phase = 'typing' | 'word-done';
	let phase = $state<Phase>('typing');

	// Words animating out above
	type LeavingWord = {
		id: number;
		word: Word;
		results: ('done-correct' | 'done-wrong')[];
		leaving: boolean;
	};
	let leavingWords = $state<LeavingWord[]>([]);

	// Stats
	let correctChars = $state(0);
	let totalChars = $state(0);
	let wordsCompleted = $state(0);
	let startTime = $state<number | null>(null);
	let elapsed = $state(0);
	let timerInterval: ReturnType<typeof setInterval> | null = null;

	const wpm = $derived(elapsed > 0 ? Math.round((wordsCompleted * 60) / elapsed) : 0);
	const accuracy = $derived(totalChars > 0 ? Math.round((correctChars / totalChars) * 100) : 100);
	const currentWord = $derived(wordIdx < words.length ? words[wordIdx] : null);

	let inputEl = $state<HTMLInputElement | null>(null);
	$effect(() => { inputEl?.focus(); });

	function startTimer() {
		if (timerInterval) return;
		startTime = Date.now();
		timerInterval = setInterval(() => {
			elapsed = Math.floor((Date.now() - startTime!) / 1000);
		}, 500);
	}

	function stopTimer() {
		if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
	}

	function advanceWord() {
		wordsCompleted++;
		const finalResults = [...charStates] as ('done-correct' | 'done-wrong')[];
		const entry: LeavingWord = { id: wordIdx, word: words[wordIdx], results: finalResults, leaving: false };
		leavingWords = [...leavingWords, entry];

		setTimeout(() => {
			leavingWords = leavingWords.map(w => w.id === entry.id ? { ...w, leaving: true } : w);
			setTimeout(() => {
				leavingWords = leavingWords.filter(w => w.id !== entry.id);
			}, 480);
		}, 16);

		wordIdx++;
		charIdx = 0;
		currentTyped = '';
		phase = 'typing';

		if (wordIdx >= words.length) {
			stopTimer();
			setTimeout(() => {
				ondone({
					wpm: elapsed > 0 ? Math.round((SESSION_SIZE * 60) / elapsed) : 0,
					accuracy: Math.round((correctChars / (totalChars || 1)) * 100),
					elapsed: elapsed || 1,
					correct: correctChars,
					wrong: totalChars - correctChars
				});
			}, 600);
		} else {
			charStates = Array(words[wordIdx].word.length).fill(null);
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (wordIdx >= words.length) return;

		// Space advances after a word is done
		if (phase === 'word-done' && e.key === ' ') {
			e.preventDefault();
			advanceWord();
			return;
		}

		// Block all input while waiting
		if (phase !== 'typing') {
			e.preventDefault();
			return;
		}

		if (startTime === null && /^[a-zA-Z]$/.test(e.key)) startTimer();

		const word = words[wordIdx];
		const target = stripTones(word.pinyins[charIdx]);

		if (e.key === 'Backspace') {
			e.preventDefault();
			currentTyped = currentTyped.slice(0, -1);
			return;
		}

		if (!/^[a-zA-Z]$/.test(e.key)) return;
		currentTyped += e.key.toLowerCase();

		if (currentTyped.length >= target.length) {
			const isCorrect = currentTyped === target;
			charStates[charIdx] = isCorrect ? 'done-correct' : 'done-wrong';
			totalChars++;
			if (isCorrect) correctChars++;

			const isLastChar = charIdx === word.word.length - 1;
			if (isLastChar) {
				phase = 'word-done';
			} else {
				// Auto-advance to next char
				charIdx++;
				currentTyped = '';
				phase = 'typing';
			}
		}
	}
</script>

<!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
<div class="practice" onclick={() => inputEl?.focus()}>
	<StatsBar current={wordsCompleted} total={SESSION_SIZE} {wpm} {accuracy} {elapsed} />

	<div class="stage">
		<div class="word-viewport">
			{#each leavingWords as lw (lw.id)}
				<div class="word-row lw-row" class:leaving={lw.leaving}>
					{#each lw.word.word.split('') as char, ci}
						<CharacterTile
							char={char}
							displayPinyin={lw.word.pinyins[ci]}
							target={stripTones(lw.word.pinyins[ci])}
							typed=""
							state={lw.results[ci]}
						/>
					{/each}
				</div>
			{/each}

			{#if currentWord}
				{#key wordIdx}
					<div class="word-row active-row">
						{#each currentWord.word.split('') as char, ci}
							<CharacterTile
								char={char}
								displayPinyin={currentWord.pinyins[ci]}
								target={stripTones(currentWord.pinyins[ci])}
								typed={ci === charIdx ? currentTyped : ''}
								state={charStates[ci] ?? (ci === charIdx ? 'active' : 'untyped')}
							/>
						{/each}
					</div>
				{/key}
			{/if}
		</div>

		<div class="prompt" class:visible={phase !== 'typing'}>
			{#if phase === 'word-done'}
				<kbd>空格</kbd> 下一词
			{/if}
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

		<p class="tip">点击此处聚焦 · 输入拼音 · 无需声调</p>
	</div>
</div>

<style>
	.practice {
		display: flex;
		flex-direction: column;
		flex: 1;
	}

	.stage {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		flex: 1;
		gap: 1.5rem;
		padding: 2rem;
	}

	.word-viewport {
		position: relative;
		height: 320px;
		width: 100%;
		max-width: 800px;
		display: flex;
		align-items: center;
		justify-content: center;
		-webkit-mask-image: linear-gradient(to bottom, transparent 0%, black 30%, black 100%);
		mask-image: linear-gradient(to bottom, transparent 0%, black 30%, black 100%);
		overflow: hidden;
	}

	.word-row {
		position: absolute;
		display: flex;
		align-items: flex-end;
		gap: 0.5rem;
	}

	.lw-row {
		transition: transform 480ms cubic-bezier(0.4, 0, 0.2, 1), opacity 480ms ease;
		transform: translateY(0);
		opacity: 0.6;
	}
	.lw-row.leaving {
		transform: translateY(-160px);
		opacity: 0;
	}

	.active-row {
		animation: wordIn 280ms cubic-bezier(0.4, 0, 0.2, 1) both;
	}

	@keyframes wordIn {
		from { opacity: 0; transform: translateY(24px); }
		to   { opacity: 1; transform: translateY(0); }
	}

	.prompt {
		height: 2rem;
		display: flex;
		align-items: center;
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
		font-size: 0.78rem;
		color: var(--text-muted);
		letter-spacing: 0.05em;
	}
</style>

