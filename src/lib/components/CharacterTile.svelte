<script lang="ts">
	/**
	 * Renders a single character with its pinyin label above.
	 * Per-letter coloring: correct=accent, wrong=error, untyped=muted.
	 *
	 * state: 'untyped' | 'active' | 'done-correct' | 'done-wrong'
	 * typed: what the user has typed so far for this syllable (stripped tones)
	 * target: the correct stripped pinyin (e.g. "dian")
	 * displayPinyin: tone-marked display string (e.g. "diàn")
	 */
	let {
		char,
		displayPinyin,
		target,
		typed = '',
		state = 'untyped'
	} = $props<{
		char: string;
		displayPinyin: string;
		target: string;
		typed?: string;
		state?: 'untyped' | 'active' | 'done-correct' | 'done-wrong';
	}>();

	// Split tone-marked pinyin into letters for display.
	// We map each display letter to a status based on position.
	type LetterStatus = 'correct' | 'wrong' | 'pending';

	const letters = $derived(
		Array.from(displayPinyin).map((letter, i) => {
			if (state === 'done-correct') return { letter, status: 'correct' as LetterStatus };
			if (state === 'done-wrong') return { letter, status: 'wrong' as LetterStatus };
			if (state === 'untyped') return { letter, status: 'pending' as LetterStatus };
			// active — compare typed vs target per position
			// displayPinyin may have accented chars; target is stripped.
			// We align by index since lengths match (1 display char = 1 stripped char in pinyin).
			if (i < typed.length) {
				const status: LetterStatus = typed[i] === target[i] ? 'correct' : 'wrong';
				return { letter, status };
			}
			return { letter, status: 'pending' as LetterStatus };
		})
	);
</script>

<div class="tile" class:active={state === 'active'} class:correct={state === 'done-correct'} class:wrong={state === 'done-wrong'}>
	<div class="pinyin" aria-hidden="true">
		{#each letters as { letter, status }}
			<span class="letter {status}">{letter}</span>
		{/each}
	</div>
	<div class="char">{char}</div>
</div>

<style>
	.tile {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.4rem;
		padding: 0.75rem 0.6rem 0.6rem;
		border-radius: var(--radius-sm);
		border: 2px solid transparent;
		transition: border-color var(--transition), background var(--transition), transform var(--transition);
		min-width: 5rem;
	}

	.tile.active {
		border-color: var(--accent);
		background: var(--accent-light);
	}

	.tile.correct {
		animation: pop 200ms ease;
	}

	.tile.wrong {
		animation: shake 300ms ease;
	}

	.pinyin {
		font-size: 1.56rem;
		letter-spacing: 0.02em;
		line-height: 1;
		min-height: 1em;
		font-family: var(--font-ui);
	}

	.letter.correct {
		color: var(--accent);
	}
	.letter.wrong {
		color: var(--error);
	}
	.letter.pending {
		color: var(--text-muted);
	}

	.char {
		font-family: var(--font-zh);
		font-size: 4rem;
		line-height: 1;
		color: var(--text);
		transition: color var(--transition);
	}

	.tile.correct .char {
		color: var(--success);
	}

	.tile.wrong .char {
		color: var(--error);
	}

	@keyframes pop {
		0%   { transform: scale(1); }
		50%  { transform: scale(1.15); }
		100% { transform: scale(1); }
	}

	@keyframes shake {
		0%, 100% { transform: translateX(0); }
		20%       { transform: translateX(-4px); }
		40%       { transform: translateX(4px); }
		60%       { transform: translateX(-3px); }
		80%       { transform: translateX(3px); }
	}
</style>
