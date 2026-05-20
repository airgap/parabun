import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let name = $.fallback($$props['name'], "world");
	let foo = $.fallback($$props['foo'], 'foo');

	$$renderer.push(`<h1>Hello, ${$.escape(name)}</h1> `);

	const each_array = $.ensure_array_like([]);

	if (each_array.length !== 0) {
		$$renderer.push('<!--[-->');

		for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
			let _ = each_array[$$index];

			$$renderer.push(`<!---->nope`);
		}
	} else {
		$$renderer.push('<!--[!-->');
		$$renderer.push(`<p>${$.escape(foo)}</p>`);
	}

	$$renderer.push(`<!--]--> <div>`);

	const each_array_1 = $.ensure_array_like([]);

	if (each_array_1.length !== 0) {
		$$renderer.push('<!--[-->');

		for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
			let _ = each_array_1[$$index_1];

			$$renderer.push(`<!---->nope`);
		}
	} else {
		$$renderer.push('<!--[!-->');
		$$renderer.push(`<p>${$.escape(foo)}</p>`);
	}

	$$renderer.push(`<!--]--></div>`);
	$.bind_props($$props, { name, foo });
}