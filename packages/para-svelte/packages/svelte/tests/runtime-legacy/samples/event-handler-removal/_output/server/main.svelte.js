import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let input = $$props['input'];
	let blurred = $.fallback($$props['blurred'], false);
	let visible = $.fallback($$props['visible'], true);

	if (visible) {
		$$renderer.push('<!--[0-->');
		$$renderer.push(`<input/>`);
	} else {
		$$renderer.push('<!--[-1-->');
	}

	$$renderer.push(`<!--]-->`);
	$.bind_props($$props, { input, blurred, visible });
}