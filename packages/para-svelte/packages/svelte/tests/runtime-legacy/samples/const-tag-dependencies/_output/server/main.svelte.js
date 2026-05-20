import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let value = $.fallback($$props['value'], 4);
	let a = $.fallback($$props['a'], 3);
	let b = $.fallback($$props['b'], 4);

	$$renderer.push(`<!--[-->`);

	const each_array = $.ensure_array_like([value]);

	for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
		let n = each_array[$$index];
		const ab = a + b;

		$$renderer.push(`<div>${$.escape(ab)}</div>`);
	}

	$$renderer.push(`<!--]-->`);
	$.bind_props($$props, { value, a, b });
}