import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	const tag = "button";
	let handler = $$props['handler'];

	$.element($$renderer, tag, void 0, () => {
		$$renderer.push(`Foo`);
	});

	$.bind_props($$props, { handler });
}