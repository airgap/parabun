import * as $ from 'svelte/internal/server';

export default function Countdown($$renderer, $$props) {
	let count = $$props['count'];

	if (count > 0) {
		$$renderer.push('<!--[0-->');
		$$renderer.push(`<!--[-->`);
		$.slot($$renderer, $$props, 'default', { count: count - 1 }, null);
		$$renderer.push(`<!--]-->`);
	} else {
		$$renderer.push('<!--[-1-->');
	}

	$$renderer.push(`<!--]-->`);
	$.bind_props($$props, { count });
}