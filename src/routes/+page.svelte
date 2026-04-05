<script lang="ts">
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';
	import HomeScreen from '$lib/components/HomeScreen.svelte';
	import PracticeArea from '$lib/components/PracticeArea.svelte';
	import ResultsScreen from '$lib/components/ResultsScreen.svelte';

	type Screen = 'home' | 'practice' | 'results';
	type Result = { wpm: number; accuracy: number; elapsed: number; correct: number; wrong: number };

	let theme = $state<'light' | 'dark'>('light');

	// Apply theme to <html> so all CSS variables (including body) pick it up
	$effect(() => {
		document.documentElement.setAttribute('data-theme', theme);
	});
	let screen = $state<Screen>('home');
	let lastResult = $state<Result | null>(null);
	let practiceKey = $state(0); // increment to remount PracticeArea

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
			<HomeScreen onstart={startPractice} />
		{:else if screen === 'practice'}
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
</style>

