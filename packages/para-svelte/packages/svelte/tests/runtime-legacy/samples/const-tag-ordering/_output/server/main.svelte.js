import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let value = $.fallback($$props['value'], 4);

	$$renderer.push(`<!--[-->`);

	const each_array = $.ensure_array_like([value]);

	for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
		let n = each_array[$$index];
		const squared = n * n;
		const cubed = squared * n;
		const hypercubed = cubed * n;

		$$renderer.push(`<div>${$.escape(n)} ^ 4 = ${$.escape(hypercubed)}</div>`);
	}

	$$renderer.push(`<!--]-->`);
	$.bind_props($$props, { value });
}