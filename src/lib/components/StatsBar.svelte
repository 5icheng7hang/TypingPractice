<script lang="ts">
	let {
		current,
		total,
		wpm,
		accuracy,
		elapsed
	} = $props<{
		current: number;
		total: number;
		wpm: number;
		accuracy: number;
		elapsed: number; // seconds
	}>();

	const mm = $derived(String(Math.floor(elapsed / 60)).padStart(2, '0'));
	const ss = $derived(String(elapsed % 60).padStart(2, '0'));
</script>

<div class="stats-bar">
	<div class="stat">
		<span class="value">{wpm}</span>
		<span class="label">词/分</span>
	</div>
	<div class="stat">
		<span class="value">{accuracy}<small>%</small></span>
		<span class="label">准确率</span>
	</div>
	<div class="stat">
		<span class="value">{mm}:{ss}</span>
		<span class="label">用时</span>
	</div>
	<div class="progress">
		<div class="progress-track">
			<div class="progress-fill" style="width: {(current / total) * 100}%"></div>
		</div>
		<span class="progress-label">{current} / {total}</span>
	</div>
</div>

<style>
	.stats-bar {
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

	.value {
		font-size: 1.25rem;
		font-weight: 600;
		color: var(--text);
		font-variant-numeric: tabular-nums;
	}

	.value small {
		font-size: 0.75rem;
		font-weight: 400;
	}

	.label {
		font-size: 0.75rem;
		color: var(--text-muted);
		letter-spacing: 0.05em;
	}

	.progress {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin-left: auto;
	}

	.progress-track {
		width: 120px;
		height: 4px;
		background: var(--border);
		border-radius: 999px;
		overflow: hidden;
	}

	.progress-fill {
		height: 100%;
		background: var(--accent);
		border-radius: 999px;
		transition: width 200ms ease;
	}

	.progress-label {
		font-size: 0.8rem;
		color: var(--text-muted);
		font-variant-numeric: tabular-nums;
		white-space: nowrap;
	}
</style>
