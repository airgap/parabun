import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';
import Counter from './Counter.svelte';

export default function Main($$anchor) {
	Counter($$anchor, {});
}