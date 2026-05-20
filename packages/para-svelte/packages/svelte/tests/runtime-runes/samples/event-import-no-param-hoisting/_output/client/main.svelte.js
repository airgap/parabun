import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';
import { num, increment } from './state.svelte.js';
import Component from './Component.svelte';

export default function Main($$anchor, $$props) {
	$.push($$props, true);

	function foo() {
		increment();
		console.log(num);
	}

	Component($$anchor, { foo });
	$.pop();
}