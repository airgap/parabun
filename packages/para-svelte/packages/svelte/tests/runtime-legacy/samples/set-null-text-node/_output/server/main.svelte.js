import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let foo = $$props['foo'];

	$$renderer.push(`<!---->foo is ${$.escape(foo)}`);
	$.bind_props($$props, { foo });
}