import * as $ from 'svelte/internal/server';
import Link from "./Link.svelte";

export default function Main($$renderer) {
	let foo = [
		{ text: "foo0" },
		{ text: "foo1" },
		{ text: "foo2" },
		{ text: "foo3" }
	];

	let $$settled = true;
	let $$inner_renderer;

	function $$render_inner($$renderer) {
		Link($$renderer, { item: { text: "foo" } });
		$$renderer.push(`<!----> `);
		Link($$renderer, { item: foo[0] });
		$$renderer.push(`<!----> `);

		Link($$renderer, {
			get item() {
				return foo[0];
			},

			set item($$value) {
				foo[0] = $$value;
				$$settled = false;
			}
		});

		$$renderer.push(`<!----> <!--[-->`);

		const each_array = $.ensure_array_like(foo);

		for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
			let item = each_array[$$index];

			Link($$renderer, {
				get item() {
					return item;
				},

				set item($$value) {
					item = $$value;
					$$settled = false;
				}
			});
		}

		$$renderer.push(`<!--]-->`);
	}

	do {
		$$settled = true;
		$$inner_renderer = $$renderer.copy();
		$$render_inner($$inner_renderer);
	} while (!$$settled);

	$$renderer.subsume($$inner_renderer);
}