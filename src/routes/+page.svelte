<script lang="ts">
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';
	import HomeScreen from '$lib/components/HomeScreen.svelte';
	import PracticeArea from '$lib/components/PracticeArea.svelte';
	import ResultsScreen from '$lib/components/ResultsScreen.svelte';
	import EbookDropZone from '$lib/components/EbookDropZone.svelte';
	import EbookChapterList from '$lib/components/EbookChapterList.svelte';
	import EbookPractice from '$lib/components/EbookPractice.svelte';
	import type { EpubBook } from '$lib/epub-parser.js';
	import { getProgress, type ReadingProgress } from '$lib/epub-store.js';

	type Screen =
		| 'home'
		| 'practice'
		| 'results'
		| 'ebook-drop'
		| 'ebook-chapters'
		| 'ebook-practice';
	type Result = { wpm: number; accuracy: number; elapsed: number; correct: number; wrong: number };

	let theme = $state<'light' | 'dark'>('light');

	// Apply theme to <html> so all CSS variables (including body) pick it up
	$effect(() => {
		document.documentElement.setAttribute('data-theme', theme);
	});
	let screen = $state<Screen>('home');
	let lastResult = $state<Result | null>(null);
	let practiceKey = $state(0); // increment to remount PracticeArea

	// Ebook mode state
	let ebookData = $state<{ book: EpubBook; bookId: string } | null>(null);
	let ebookProgress = $state<ReadingProgress | null>(null);
	let ebookStart = $state<{ chapter: number; paragraph: number }>({ chapter: 0, paragraph: 0 });

	function startPractice() {
		practiceKey++;
		screen = 'practice';
	}

	function handleDone(result: Result) {
		lastResult = result;
		screen = 'results';
	}

	function retry() {
		startPractice();
	}

	function goHome() {
		screen = 'home';
	}

	function openEbookMode() {
		screen = 'ebook-drop';
	}

	async function handleBookSelected(book: EpubBook, bookId: string) {
		ebookData = { book, bookId };
		// Try to load saved progress
		const progress = await getProgress(bookId);
		ebookProgress = progress;
		screen = 'ebook-chapters';
	}

	function handleChapterSelected(chapterIndex: number, paragraphIndex: number) {
		ebookStart = { chapter: chapterIndex, paragraph: paragraphIndex };
		screen = 'ebook-practice';
	}

	function handleEbookBack() {
		if (screen === 'ebook-practice') {
			screen = 'ebook-chapters';
		} else if (screen === 'ebook-chapters') {
			screen = 'ebook-drop';
		} else {
			screen = 'home';
		}
	}
</script>

<svelte:head>
	<title>汉字练习</title>
</svelte:head>

<div id="app">
	<header class="app-header">
		<span class="app-name">汉字练习</span>
		<ThemeToggle bind:theme />
	</header>

	<main class="app-main">
		{#if screen === 'home'}
			<HomeScreen onstart={startPractice} onebook={openEbookMode} />
		{:else if screen === 'practice'}
			<div class="practice-back-row">
				<button class="back-link" onclick={goHome}>← 返回首页</button>
			</div>
			{#key practiceKey}
				<PracticeArea ondone={handleDone} />
			{/key}
		{:else if screen === 'results' && lastResult}
			<ResultsScreen
				wpm={lastResult.wpm}
				accuracy={lastResult.accuracy}
				elapsed={lastResult.elapsed}
				correct={lastResult.correct}
				wrong={lastResult.wrong}
				onretry={retry}
				onhome={goHome}
			/>
		{:else if screen === 'ebook-drop'}
			<EbookDropZone onbook={handleBookSelected} />
			<div class="ebook-back-row">
				<button class="back-link" onclick={goHome}>← 返回首页</button>
			</div>
		{:else if screen === 'ebook-chapters' && ebookData}
			<EbookChapterList
				book={ebookData.book}
				bookId={ebookData.bookId}
				initialChapter={ebookProgress?.chapterIndex}
				initialParagraph={ebookProgress?.paragraphIndex}
				onselect={handleChapterSelected}
				onback={() => { screen = 'ebook-drop'; }}
			/>
		{:else if screen === 'ebook-practice' && ebookData}
			<EbookPractice
				book={ebookData.book}
				bookId={ebookData.bookId}
				startChapter={ebookStart.chapter}
				startParagraph={ebookStart.paragraph}
				onback={handleEbookBack}
			/>
		{/if}
	</main>
</div>

<style>
	:global(#app) {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
	}

	.app-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.75rem 1.5rem;
		border-bottom: 1px solid var(--border);
		background: var(--surface);
	}

	.app-name {
		font-family: var(--font-zh);
		font-size: 1rem;
		font-weight: 600;
		color: var(--text-muted);
		letter-spacing: 0.1em;
	}

	.app-main {
		display: flex;
		flex-direction: column;
		flex: 1;
	}

	.ebook-back-row {
		display: flex;
		justify-content: center;
		padding: 0 0 2rem;
	}

	.back-link {
		background: none;
		border: none;
		color: var(--text-muted);
		font-family: var(--font-ui);
		font-size: 0.85rem;
		cursor: pointer;
		padding: 0.25rem 0.5rem;
		transition: color var(--transition);
	}

	.back-link:hover {
		color: var(--text);
	}

	.practice-back-row {
		display: flex;
		padding: 0.5rem 1.5rem;
		background: var(--surface);
		border-bottom: 1px solid var(--border);
	}
</style>
