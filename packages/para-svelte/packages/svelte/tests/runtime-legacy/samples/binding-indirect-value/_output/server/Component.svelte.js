import * as $ from 'svelte/internal/server';

export default function Component($$renderer, $$props) {
	let value = $$props['value'];

	value = "bar";
	$$renderer.push(`<!---->Child component "${$.escape(value)}"<br/>`);
	$.bind_props($$props, { value });
}