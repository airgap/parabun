import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let array = $.fallback($$props['array'], () => [1, 2, 3], true);
		let baz = $.fallback($$props['baz'], 3);
		const foo = (item) => item;

		$$renderer.push(`<!--[-->`);

		const each_array = $.ensure_array_like(array);

		for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
			let item = each_array[$$index];

			const bar = array.map((item) => {
				const bar = baz;
				const foo = (item) => item * bar;

				return foo(item);
			});

			$$renderer.push(`<p>${$.escape(foo(item))}</p> <p>${$.escape(bar)}</p>`);
		}

		$$renderer.push(`<!--]-->`);
		$.bind_props($$props, { array, baz });
	});
}