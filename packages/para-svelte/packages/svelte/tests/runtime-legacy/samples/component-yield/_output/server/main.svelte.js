import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let test = $.fallback($$props['test'], true);

	$$renderer.push(`<p>Hello `);

	if (test) {
		$$renderer.push('<!--[0-->');
		$$renderer.push(`<!--[-->`);
		$.slot($$renderer, $$props, 'default', {}, null);
		$$renderer.push(`<!--]-->`);
	} else {
		$$renderer.push('<!--[-1-->');
	}

	$$renderer.push(`<!--]--></p>`);
	$.bind_props($$props, { test });
}