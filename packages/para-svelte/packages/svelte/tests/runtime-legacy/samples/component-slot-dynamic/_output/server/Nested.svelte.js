import * as $ from 'svelte/internal/server';

export default function Nested($$renderer, $$props) {
	let foo = $.fallback($$props['foo'], 'a');

	$$renderer.push(`<!--[-->`);

	$.slot($$renderer, $$props, 'default', {}, () => {
		$$renderer.push(`<span>${$.escape(foo)}</span>`);
	});

	$$renderer.push(`<!--]-->`);
	$.bind_props($$props, { foo });
}