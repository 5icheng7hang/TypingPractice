<script lang="ts">
	let {
		wpm,
		accuracy,
		elapsed,
		correct,
		wrong,
		onretry,
		onhome
	} = $props<{
		wpm: number;
		accuracy: number;
		elapsed: number;
		correct: number;
		wrong: number;
		onretry: () => void;
		onhome: () => void;
	}>();

	const mm = $derived(String(Math.floor(elapsed / 60)).padStart(2, '0'));
	const ss = $derived(String(elapsed % 60).padStart(2, '0'));

	const grade = $derived(
		accuracy >= 98 ? '完美' :
		accuracy >= 90 ? '优秀' :
		accuracy >= 75 ? '良好' :
		accuracy >= 60 ? '及格' : '继续加油'
	);
</script>

<div class="results">
	<div class="card">
		<div class="grade">{grade}</div>

		<div class="stats">
			<div class="stat-block">
				<span class="big">{wpm}</span>
				<span class="unit">词/分钟</span>
			</div>
			<div class="divider"></div>
			<div class="stat-block">
				<span class="big">{accuracy}<small>%</small></span>
				<span class="unit">准确率</span>
			</div>
			<div class="divider"></div>
			<div class="stat-block">
				<span class="big">{mm}:{ss}</span>
				<span class="unit">用时</span>
			</div>
		</div>

		<div class="breakdown">
			<span class="correct-count">✓ {correct} 正确</span>
			<span class="wrong-count">✗ {wrong} 错误</span>
		</div>

		<div class="actions">
			<button class="btn-primary" onclick={onretry}>再练一轮</button>
			<button class="btn-secondary" onclick={onhome}>返回首页</button>
		</div>
	</div>
</div>

<style>
	.results {
		display: flex;
		align-items: center;
		justify-content: center;
		flex: 1;
		padding: 2rem;
	}

	.card {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 2rem;
		padding: 3rem 3.5rem;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius);
		max-width: 480px;
		width: 100%;
		animation: fadeUp 300ms ease;
	}

	.grade {
		font-family: var(--font-zh);
		font-size: 2rem;
		font-weight: 700;
		color: var(--accent);
		letter-spacing: 0.1em;
	}

	.stats {
		display: flex;
		align-items: center;
		gap: 2rem;
		width: 100%;
		justify-content: center;
	}

	.stat-block {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.25rem;
	}

	.big {
		font-size: 2.25rem;
		font-weight: 700;
		color: var(--text);
		font-variant-numeric: tabular-nums;
		line-height: 1;
	}

	.big small {
		font-size: 1rem;
		font-weight: 400;
	}

	.unit {
		font-size: 0.75rem;
		color: var(--text-muted);
		letter-spacing: 0.05em;
	}

	.divider {
		width: 1px;
		height: 3rem;
		background: var(--border);
	}

	.breakdown {
		display: flex;
		gap: 1.5rem;
		font-size: 0.9rem;
	}

	.correct-count { color: var(--success); }
	.wrong-count   { color: var(--error); }

	.actions {
		display: flex;
		gap: 0.75rem;
		flex-wrap: wrap;
		justify-content: center;
	}

	.btn-primary {
		font-family: var(--font-zh);
		font-size: 1rem;
		font-weight: 500;
		color: var(--bg);
		background: var(--text);
		border: none;
		border-radius: var(--radius-sm);
		padding: 0.7rem 2rem;
		cursor: pointer;
		letter-spacing: 0.08em;
		transition: opacity var(--transition), transform var(--transition);
	}
	.btn-primary:hover { opacity: 0.85; transform: translateY(-1px); }
	.btn-primary:active { transform: translateY(0); }

	.btn-secondary {
		font-family: var(--font-zh);
		font-size: 1rem;
		color: var(--text-muted);
		background: transparent;
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		padding: 0.7rem 2rem;
		cursor: pointer;
		letter-spacing: 0.08em;
		transition: color var(--transition), border-color var(--transition), transform var(--transition);
	}
	.btn-secondary:hover { color: var(--text); border-color: var(--text-muted); transform: translateY(-1px); }
	.btn-secondary:active { transform: translateY(0); }

	@keyframes fadeUp {
		from { opacity: 0; transform: translateY(12px); }
		to   { opacity: 1; transform: translateY(0); }
	}
</style>
