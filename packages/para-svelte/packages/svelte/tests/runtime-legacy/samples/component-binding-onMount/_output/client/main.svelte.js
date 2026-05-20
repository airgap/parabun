import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Mount from './Mount.svelte';
import { onMount, mount } from 'svelte';

var root = $.from_html(`<div id="target"></div>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	onMount(() => {
		// @ts-ignore
		mount(Mount, { target: document.querySelector('#target') });
	});

	$.init();

	var div = root();

	$.append($$anchor, div);
	$.pop();
}