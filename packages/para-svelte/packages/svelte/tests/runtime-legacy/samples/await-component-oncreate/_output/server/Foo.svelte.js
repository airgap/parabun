import * as $ from 'svelte/internal/server';
import { onMount } from 'svelte';

export default function Foo($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let value = $$props['value'];
		let called = false;

		onMount(() => {
			called = true;
		});

		$$renderer.push(`<p>${$.escape(value)}</p> <p>${$.escape(called)}</p>`);
		$.bind_props($$props, { value });
	});
}