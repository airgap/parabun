import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import { onDestroy } from 'svelte';
import { destroyed } from './destroyed.js';

export default function C($$anchor, $$props) {
	$.push($$props, false);

	let yes = 1;

	onDestroy(() => destroyed.push('C'));
	$.init();
	$.pop();
}