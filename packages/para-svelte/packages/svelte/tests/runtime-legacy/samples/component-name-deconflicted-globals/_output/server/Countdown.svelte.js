import * as $ from 'svelte/internal/server';

export default function Countdown_1($$renderer, $$props) {
	let count = $$props['count'];

	$$renderer.push(`<span>${$.escape(count)}</span> `);

	if (count > 1) {
		$$renderer.push('<!--[0-->');
		Countdown($$renderer, { count: count - 1 });
	} else {
		$$renderer.push('<!--[-1-->');
	}

	$$renderer.push(`<!--]-->`);
	$.bind_props($$props, { count });
}