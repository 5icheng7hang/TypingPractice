<script lang="ts">
	let { onstart, onebook } = $props<{ onstart: () => void; onebook: () => void }>();
</script>

<div class="home">
	<div class="hero">
		<h1 class="title">汉字练习</h1>
		<p class="subtitle">拼音打字训练</p>
	</div>

	<div class="info">
		<div class="info-item">
			<span class="info-num">30</span>
			<span class="info-label">词/轮</span>
		</div>
		<div class="info-divider"></div>
		<div class="info-item">
			<span class="info-num">二三四</span>
			<span class="info-label">字词混合</span>
		</div>
		<div class="info-divider"></div>
		<div class="info-item">
			<span class="info-num">拼</span>
			<span class="info-label">无声调</span>
		</div>
	</div>

	<div class="buttons">
		<button class="start-btn" onclick={onstart}>
			词汇练习
		</button>
		<button class="ebook-btn" onclick={onebook}>
			📖 电子书模式
		</button>
	</div>

	<p class="hint">选择模式开始练习</p>
</div>

<style>
	.home {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		flex: 1;
		gap: 2.5rem;
		padding: 2rem;
	}

	.hero {
		text-align: center;
	}

	.title {
		font-family: var(--font-zh);
		font-size: clamp(3rem, 8vw, 5rem);
		font-weight: 700;
		color: var(--text);
		letter-spacing: 0.1em;
		line-height: 1;
	}

	.subtitle {
		margin-top: 0.5rem;
		font-size: 0.95rem;
		color: var(--text-muted);
		letter-spacing: 0.15em;
	}

	.info {
		display: flex;
		align-items: center;
		gap: 1.5rem;
		padding: 1rem 2rem;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius);
	}

	.info-item {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.25rem;
	}

	.info-num {
		font-family: var(--font-zh);
		font-size: 1.25rem;
		font-weight: 600;
		color: var(--text);
	}

	.info-label {
		font-size: 0.75rem;
		color: var(--text-muted);
		letter-spacing: 0.05em;
	}

	.info-divider {
		width: 1px;
		height: 2rem;
		background: var(--border);
	}

	.buttons {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1rem;
	}

	.start-btn {
		font-family: var(--font-zh);
		font-size: 1.1rem;
		font-weight: 500;
		color: var(--bg);
		background: var(--text);
		border: none;
		border-radius: var(--radius);
		padding: 0.85rem 3rem;
		cursor: pointer;
		letter-spacing: 0.1em;
		transition: opacity var(--transition), transform var(--transition);
	}

	.start-btn:hover {
		opacity: 0.85;
		transform: translateY(-1px);
	}

	.start-btn:active {
		transform: translateY(0);
	}

	.ebook-btn {
		font-family: var(--font-zh);
		font-size: 1rem;
		font-weight: 500;
		color: var(--accent);
		background: var(--accent-light);
		border: 1px solid var(--accent);
		border-radius: var(--radius);
		padding: 0.75rem 2.5rem;
		cursor: pointer;
		letter-spacing: 0.1em;
		transition: opacity var(--transition), transform var(--transition), background var(--transition);
	}

	.ebook-btn:hover {
		opacity: 0.85;
		transform: translateY(-1px);
		background: var(--accent);
		color: var(--bg);
	}

	.ebook-btn:active {
		transform: translateY(0);
	}

	.hint {
		font-size: 0.8rem;
		color: var(--text-muted);
		letter-spacing: 0.05em;
	}
</style>
