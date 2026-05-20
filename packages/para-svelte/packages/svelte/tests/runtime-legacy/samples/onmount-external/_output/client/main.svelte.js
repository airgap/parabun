import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import { onMount } from 'svelte';
import * as $ from 'svelte/internal/client';

class MyClass {
	constructor() {
		onMount(() => console.log('mounted'));
	}
}

export default function Main($$anchor, $$props) {
	$.push($$props, false);
	new MyClass();
	$.init();
	$.pop();
}