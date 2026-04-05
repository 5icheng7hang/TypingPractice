<script lang="ts">
	import type { EpubBook } from '$lib/epub-parser.js';

	let { book, bookId, initialChapter, initialParagraph, onselect, onback } = $props<{
		book: EpubBook;
		bookId: string;
		initialChapter?: number;
		initialParagraph?: number;
		onselect: (chapterIndex: number, paragraphIndex: number) => void;
		onback: () => void;
	}>();

	// svelte-ignore state_referenced_locally
	const savedChapter = initialChapter;
	// svelte-ignore state_referenced_locally
	const savedParagraph = initialParagraph;

	let expandedChapter: number | null = $state(savedChapter ?? null);

	function toggleChapter(index: number) {
		expandedChapter = expandedChapter === index ? null : index;
	}

	function truncate(text: string, maxLen: number = 60): string {
		if (text.length <= maxLen) return text;
		return text.slice(0, maxLen) + '...';
	}

	function isLastPosition(chapterIndex: number, paragraphIndex: number): boolean {
		return savedChapter === chapterIndex && savedParagraph === paragraphIndex;
	}
</script>

<div class="chapter-list">
	<header class="header">
		<div class="header-top">
			<button class="back-btn" onclick={onback}>← 返回</button>
		</div>
		<h1 class="book-title">{book.title}</h1>
		<p class="book-author">{book.author}</p>
	</header>

	<div class="chapters">
		{#each book.chapters as chapter, ci}
			<div class="chapter">
				<button
					class="chapter-header"
					class:expanded={expandedChapter === ci}
					onclick={() => toggleChapter(ci)}
				>
					<span class="chevron">{expandedChapter === ci ? '▼' : '▶'}</span>
					<span class="chapter-title">{chapter.title}</span>
					<span class="chapter-count">({chapter.paragraphs.length}段)</span>
				</button>

				{#if expandedChapter === ci}
					<ul class="paragraph-list">
						{#each chapter.paragraphs as paragraph, pi}
							<li>
								<button
									class="paragraph-item"
									class:last-position={isLastPosition(ci, pi)}
									onclick={() => onselect(ci, pi)}
								>
									<span class="paragraph-preview">{truncate(paragraph)}</span>
									{#if isLastPosition(ci, pi)}
										<span class="badge">上次位置</span>
									{/if}
								</button>
							</li>
						{/each}
					</ul>
				{/if}
			</div>
		{/each}
	</div>
</div>

<style>
	.chapter-list {
		display: flex;
		flex-direction: column;
		height: 100%;
		max-height: 100vh;
		overflow: hidden;
	}

	.header {
		flex-shrink: 0;
		padding: 1rem 1.5rem;
		text-align: center;
	}

	.header-top {
		display: flex;
		align-items: center;
		margin-bottom: 0.75rem;
	}

	.back-btn {
		background: none;
		border: none;
		font-family: var(--font-ui);
		font-size: 0.9rem;
		color: var(--text-muted);
		cursor: pointer;
		padding: 0.25rem 0.5rem;
		border-radius: var(--radius-sm);
		transition: color var(--transition);
	}

	.back-btn:hover {
		color: var(--text);
	}

	.book-title {
		font-family: var(--font-zh);
		font-size: 1.5rem;
		font-weight: 700;
		color: var(--text);
		line-height: 1.3;
		margin-bottom: 0.25rem;
	}

	.book-author {
		font-size: 0.85rem;
		color: var(--text-muted);
	}

	.chapters {
		flex: 1;
		overflow-y: auto;
		padding: 0.5rem 1.5rem 1.5rem;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.chapter {
		display: flex;
		flex-direction: column;
	}

	.chapter-header {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		width: 100%;
		padding: 0.75rem 1rem;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius-sm);
		cursor: pointer;
		text-align: left;
		font-family: var(--font-zh);
		font-size: 0.95rem;
		color: var(--text);
		transition:
			background var(--transition),
			border-color var(--transition);
	}

	.chapter-header:hover {
		border-color: var(--accent);
	}

	.chapter-header.expanded {
		border-bottom-left-radius: 0;
		border-bottom-right-radius: 0;
		border-color: var(--accent);
	}

	.chevron {
		flex-shrink: 0;
		font-size: 0.7rem;
		color: var(--text-muted);
		width: 1rem;
		text-align: center;
	}

	.chapter-title {
		flex: 1;
		font-weight: 500;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.chapter-count {
		flex-shrink: 0;
		font-size: 0.8rem;
		color: var(--text-muted);
		font-weight: 400;
	}

	.paragraph-list {
		list-style: none;
		border: 1px solid var(--border);
		border-top: none;
		border-radius: 0 0 var(--radius-sm) var(--radius-sm);
		background: var(--surface);
		overflow: hidden;
	}

	.paragraph-item {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		width: 100%;
		padding: 0.5rem 1rem;
		background: none;
		border: none;
		border-left: 3px solid transparent;
		cursor: pointer;
		text-align: left;
		font-family: var(--font-zh);
		font-size: 0.85rem;
		color: var(--text);
		transition:
			background var(--transition),
			border-color var(--transition);
	}

	.paragraph-item:hover {
		background: var(--accent-light);
		border-left-color: var(--accent);
	}

	.paragraph-item.last-position {
		background: var(--accent-light);
		border-left-color: var(--accent);
	}

	.paragraph-preview {
		flex: 1;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		line-height: 1.5;
	}

	.badge {
		flex-shrink: 0;
		font-size: 0.7rem;
		font-family: var(--font-zh);
		color: var(--accent);
		background: var(--bg);
		border: 1px solid var(--accent);
		border-radius: var(--radius-sm);
		padding: 0.1rem 0.4rem;
		font-weight: 500;
		line-height: 1.4;
	}

	.paragraph-list li + li .paragraph-item {
		border-top: 1px solid var(--border);
	}
</style>
