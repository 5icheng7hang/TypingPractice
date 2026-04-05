<script lang="ts">
	let {
		side,
		highlight = null
	} = $props<{
		side: 'left' | 'right';
		highlight: string | null;
	}>();

	const LEFT_ROWS = [
		['q', 'w', 'e', 'r', 't'],
		['a', 's', 'd', 'f', 'g'],
		['z', 'x', 'c', 'v', 'b']
	] as const;

	const RIGHT_ROWS = [
		['y', 'u', 'i', 'o', 'p'],
		['h', 'j', 'k', 'l'],
		['n', 'm']
	] as const;

	// Real keyboard row offsets: Tab=1.5u, CapsLock=1.75u, Shift=2.25u
	// → A-row is 0.25u right of Q-row, Z-row is 0.75u right of Q-row
	// 1u = 1 key + 1 gap = 5.2rem + 0.6rem = 5.8rem
	const STAGGER = ['0', '1.45rem', '4.35rem'] as const;

	const rows = $derived(side === 'left' ? LEFT_ROWS : RIGHT_ROWS);
</script>

<div class="hand hand-{side}">
	{#each rows as row, rowIndex}
		<div
			class="row"
			style={`margin-left: ${STAGGER[rowIndex]}`}
		>
			{#each row as key}
				<div class="key" class:lit={highlight === key} aria-label={key}>
					{key.toUpperCase()}
				</div>
			{/each}
		</div>
	{/each}
</div>

<style>
	.hand {
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
	}



	.row {
		display: flex;
		flex-direction: row;
		gap: 0.6rem;
	}

	.key {
		width: 5.2rem;
		height: 5.2rem;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;

		border-radius: var(--radius-sm);
		background: var(--surface);
		border: 1.5px solid var(--border);

		font-family: var(--font-ui);
		font-size: 1.7rem;
		font-weight: 600;
		color: var(--text-muted);

		transition: all 120ms ease;
		user-select: none;
	}

	.key.lit {
		background: var(--pending);
		border-color: var(--pending);
		color: var(--bg);
		box-shadow: 0 0 0 3px color-mix(in srgb, var(--pending) 35%, transparent);
		transform: scale(1.15);
	}
</style>
