import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let items = $.fallback(
			$$props['items'],
			() => [
				{
					title: 'a title',
					data: new Promise((f) => {
						f(42);
					})
				}
			],
			true
		);

		$$renderer.push(`<!--[-->`);

		const each_array = $.ensure_array_like(items);

		for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
			let item = each_array[$$index];

			$.await(
				$$renderer,
				item.data,
				() => {
					$$renderer.push(`<p>${$.escape(item.title)}: loading...</p>`);
				},
				(result) => {
					$$renderer.push(`<p>${$.escape(item.title)}: ${$.escape(result)}</p>`);
				}
			);

			$$renderer.push(`<!--]-->`);
		}

		$$renderer.push(`<!--]-->`);
		$.bind_props($$props, { items });
	});
}