import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let maybe = $$props['maybe'];
	let raw = $$props['raw'];

	$$renderer.push(`<div>`);

	if (maybe) {
		$$renderer.push('<!--[0-->');
		$$renderer.push(`after`);
	} else {
		$$renderer.push('<!--[-1-->');
	}

	$$renderer.push(`<!--]-->${$.html(raw)}</div>`);
	$.bind_props($$props, { maybe, raw });
}