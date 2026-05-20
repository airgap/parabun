import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let tag = $$props['tag'];
	let handler = $$props['handler'];

	$.element($$renderer, tag, void 0, () => {
		$$renderer.push(`Foo`);
	});

	$.bind_props($$props, { tag, handler });
}