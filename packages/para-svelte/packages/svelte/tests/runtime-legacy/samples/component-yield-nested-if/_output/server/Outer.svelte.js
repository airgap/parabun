import * as $ from 'svelte/internal/server';

export default function Outer($$renderer, $$props) {
	let foo = $$props['foo'];

	if (foo) {
		$$renderer.push('<!--[0-->');
		$$renderer.push(`<!--[-->`);
		$.slot($$renderer, $$props, 'default', {}, null);
		$$renderer.push(`<!--]-->`);
	} else {
		$$renderer.push('<!--[-1-->');
	}

	$$renderer.push(`<!--]-->`);
	$.bind_props($$props, { foo });
}