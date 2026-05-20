import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let promise = $$props['promise'];
	let condition = $.fallback($$props['condition'], true);

	if (condition) {
		$$renderer.push('<!--[0-->');

		$.await($$renderer, promise, () => {}, (_) => {
			$$renderer.push(`hello`);
		});

		$$renderer.push(`<!--]-->`);
	} else {
		$$renderer.push('<!--[-1-->');
	}

	$$renderer.push(`<!--]-->`);
	$.bind_props($$props, { promise, condition });
}