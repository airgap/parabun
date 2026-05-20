import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let depth = $$props['depth'];

	$$renderer.push(`<span>${$.escape(depth)}</span> `);

	if (depth > 0) {
		$$renderer.push('<!--[0-->');
		Main($$renderer, { depth: depth - 1 });
		$$renderer.push(`<!---->`);
	} else {
		$$renderer.push('<!--[-1-->');
	}

	$$renderer.push(`<!--]-->`);
	$.bind_props($$props, { depth });
}