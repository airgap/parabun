import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';
import { setContext, getContext } from 'svelte';

export default function Child($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		setContext('key', 'child value');

		var $$promises = $$renderer.run([() => Promise.resolve()]);

		$$renderer.push(`<div>${$.escape(getContext('key'))}</div>`);
	});
}