import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';
import Test from './Test.svelte';

export default function Main($$anchor) {
	Test($$anchor, { a: 5 });
}