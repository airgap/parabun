import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let raw = $$props['raw'];
	let maybe = $$props['maybe'];

	$$renderer.push(`<!---->before<br/>${$.html(raw)}`);

	if (maybe) {
		$$renderer.push('<!--[0-->');
		$$renderer.push(`after`);
	} else {
		$$renderer.push('<!--[-1-->');
	}

	$$renderer.push(`<!--]-->`);
	$.bind_props($$props, { raw, maybe });
}