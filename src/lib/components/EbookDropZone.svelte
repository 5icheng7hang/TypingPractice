<script lang="ts">
	import { parseEpub, type EpubBook } from '$lib/epub-parser.js';
	import { saveBook, listBooks, deleteBook, getBook, type StoredBook } from '$lib/epub-store.js';

	let { onbook } = $props<{
		onbook: (book: EpubBook, bookId: string) => void;
	}>();

	let dragActive = $state(false);
	let loading = $state(false);
	let error = $state('');
	let cachedBooks = $state<StoredBook[]>([]);
	let fileInput = $state<HTMLInputElement | null>(null);

	$effect(() => {
		loadCachedBooks();

		return () => {
			// cleanup if needed
		};
	});

	async function loadCachedBooks() {
		try {
			cachedBooks = await listBooks();
		} catch (e) {
			console.error('Failed to load cached books:', e);
		}
	}

	function handleDragOver(e: DragEvent) {
		e.preventDefault();
		dragActive = true;
	}

	function handleDragLeave() {
		dragActive = false;
	}

	async function handleDrop(e: DragEvent) {
		e.preventDefault();
		dragActive = false;

		const files = e.dataTransfer?.files;
		if (!files || files.length === 0) return;

		const file = Array.from(files).find((f) => f.name.endsWith('.epub'));
		if (!file) {
			error = '请拖入 .epub 格式的文件';
			return;
		}

		await processFile(file);
	}

	function handleClick() {
		fileInput?.click();
	}

	async function handleFileInput(e: Event) {
		const input = e.target as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;
		await processFile(file);
		// Reset so the same file can be selected again
		input.value = '';
	}

	async function processFile(file: File) {
		loading = true;
		error = '';

		try {
			const arrayBuffer = await file.arrayBuffer();
			const book = await parseEpub(arrayBuffer);
			const bookId = await saveBook(book);
			await loadCachedBooks();
			onbook(book, bookId);
		} catch (e) {
			console.error('Failed to parse EPUB:', e);
			error = e instanceof Error ? e.message : '解析 EPUB 文件失败';
		} finally {
			loading = false;
		}
	}

	async function handleBookClick(id: string) {
		loading = true;
		error = '';

		try {
			const stored = await getBook(id);
			if (!stored) {
				error = '找不到该书籍，可能已被删除';
				return;
			}
			onbook(stored.book, stored.id);
		} catch (e) {
			console.error('Failed to load book:', e);
			error = e instanceof Error ? e.message : '加载书籍失败';
		} finally {
			loading = false;
		}
	}

	async function handleDeleteBook(e: MouseEvent, id: string) {
		e.stopPropagation();

		try {
			await deleteBook(id);
			cachedBooks = cachedBooks.filter((b) => b.id !== id);
		} catch (err) {
			console.error('Failed to delete book:', err);
		}
	}
</script>

<div class="ebook-dropzone-container">
	<!-- Drop Zone -->
	<button
		class="dropzone"
		class:active={dragActive}
		class:loading
		ondragover={handleDragOver}
		ondragleave={handleDragLeave}
		ondrop={handleDrop}
		onclick={handleClick}
		disabled={loading}
		type="button"
	>
		<input
			bind:this={fileInput}
			type="file"
			accept=".epub"
			class="file-input"
			onchange={handleFileInput}
		/>

		{#if loading}
			<div class="dropzone-content">
				<span class="loading-icon">⏳</span>
				<span class="dropzone-label">解析中...</span>
			</div>
		{:else}
			<div class="dropzone-content">
				<span class="dropzone-icon">📖</span>
				<span class="dropzone-label">拖入 EPUB 文件</span>
				<span class="dropzone-hint">或点击选择文件</span>
			</div>
		{/if}
	</button>

	{#if error}
		<p class="error-message">{error}</p>
	{/if}

	<!-- Cached Books -->
	{#if cachedBooks.length > 0}
		<div class="cached-section">
			<h3 class="cached-header">已缓存的书籍</h3>
			<ul class="cached-list">
				{#each cachedBooks as cached (cached.id)}
					<li>
						<!-- svelte-ignore a11y_no_static_element_interactions -->
						<div
							class="book-card"
							role="button"
							tabindex="0"
							onclick={() => handleBookClick(cached.id)}
							onkeydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleBookClick(cached.id); } }}
						>
							<div class="book-info">
								<span class="book-title">{cached.title}</span>
								<span class="book-author">{cached.author}</span>
							</div>
							<button
								class="delete-btn"
								type="button"
								onclick={(e) => handleDeleteBook(e, cached.id)}
								title="删除"
							>
								×
							</button>
						</div>
					</li>
				{/each}
			</ul>
		</div>
	{/if}
</div>

<style>
	.ebook-dropzone-container {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 1.5rem;
		width: 100%;
		max-width: 480px;
		margin: 0 auto;
	}

	.dropzone {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 100%;
		min-height: 180px;
		padding: 2rem;
		background: var(--surface);
		border: 2px dashed var(--border);
		border-radius: var(--radius);
		cursor: pointer;
		transition:
			border-color var(--transition),
			background var(--transition),
			transform var(--transition);
		font-family: var(--font-zh);
		color: var(--text);
	}

	.dropzone:hover:not(:disabled) {
		border-color: var(--accent);
	}

	.dropzone.active {
		border-style: solid;
		border-color: var(--accent);
		background: var(--accent-light);
	}

	.dropzone.loading {
		cursor: wait;
		opacity: 0.8;
	}

	.dropzone:disabled {
		cursor: wait;
	}

	.file-input {
		display: none;
	}

	.dropzone-content {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.5rem;
	}

	.dropzone-icon,
	.loading-icon {
		font-size: 2.5rem;
		line-height: 1;
	}

	.dropzone-label {
		font-size: 1.05rem;
		font-weight: 500;
		color: var(--text);
		letter-spacing: 0.05em;
	}

	.dropzone-hint {
		font-size: 0.8rem;
		color: var(--text-muted);
		letter-spacing: 0.03em;
	}

	.error-message {
		font-size: 0.85rem;
		color: var(--error);
		text-align: center;
		padding: 0.5rem 1rem;
	}

	.cached-section {
		width: 100%;
	}

	.cached-header {
		font-family: var(--font-zh);
		font-size: 0.85rem;
		font-weight: 500;
		color: var(--text-muted);
		letter-spacing: 0.08em;
		margin-bottom: 0.75rem;
	}

	.cached-list {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		list-style: none;
	}

	.book-card {
		display: flex;
		align-items: center;
		justify-content: space-between;
		width: 100%;
		padding: 0.75rem 1rem;
		background: var(--surface);
		border: 1px solid var(--border);
		border-radius: var(--radius-sm, 6px);
		cursor: pointer;
		transition:
			border-color var(--transition),
			background var(--transition);
		text-align: left;
		font-family: var(--font-zh);
		color: var(--text);
	}

	.book-card:hover {
		border-color: var(--accent);
		background: var(--accent-light);
	}

	.book-info {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
		min-width: 0;
		flex: 1;
	}

	.book-title {
		font-size: 0.95rem;
		font-weight: 600;
		color: var(--text);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.book-author {
		font-size: 0.78rem;
		color: var(--text-muted);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.delete-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 28px;
		height: 28px;
		flex-shrink: 0;
		margin-left: 0.75rem;
		background: none;
		border: 1px solid transparent;
		border-radius: var(--radius-sm, 6px);
		color: var(--text-muted);
		font-size: 1.2rem;
		line-height: 1;
		cursor: pointer;
		transition:
			color var(--transition),
			border-color var(--transition),
			background var(--transition);
	}

	.delete-btn:hover {
		color: var(--error);
		border-color: var(--error);
		background: var(--error-light, rgba(212, 32, 48, 0.08));
	}
</style>
