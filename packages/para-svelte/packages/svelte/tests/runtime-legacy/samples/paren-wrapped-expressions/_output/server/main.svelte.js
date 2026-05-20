import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let a = $$props['a'];
	let b = $$props['b'];
	let c = $$props['c'];

	$$renderer.push(`<span>${$.escape(a)}</span> <span${$.attr_class(a)}></span> `);

	if (b) {
		$$renderer.push('<!--[0-->');
		$$renderer.push(`<span>true</span>`);
	} else {
		$$renderer.push('<!--[-1-->');
	}

	$$renderer.push(`<!--]--> <!--[-->`);

	const each_array = $.ensure_array_like(c);

	for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
		let x = each_array[$$index];

		$$renderer.push(`<span>${$.escape(x)}</span>`);
	}

	$$renderer.push(`<!--]-->`);
	$.bind_props($$props, { a, b, c });
}