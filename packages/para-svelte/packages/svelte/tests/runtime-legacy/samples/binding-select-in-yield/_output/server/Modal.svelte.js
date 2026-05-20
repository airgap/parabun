import * as $ from 'svelte/internal/server';

export default function Modal($$renderer, $$props) {
	let hidden = $.fallback($$props['hidden'], true);

	function toggle() {
		hidden = !hidden;
	}

	if (!hidden) {
		$$renderer.push('<!--[0-->');
		$$renderer.push(`<!--[-->`);
		$.slot($$renderer, $$props, 'default', {}, null);
		$$renderer.push(`<!--]-->`);
	} else {
		$$renderer.push('<!--[-1-->');
	}

	$$renderer.push(`<!--]-->`);
	$.bind_props($$props, { hidden, toggle });
}