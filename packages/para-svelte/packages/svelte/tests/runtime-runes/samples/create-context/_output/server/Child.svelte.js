import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';
import { get } from './main.svelte';

export default function Child($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		const message = get();

		$$renderer.push(`<h1>${$.escape(message)}</h1>`);
	});
}