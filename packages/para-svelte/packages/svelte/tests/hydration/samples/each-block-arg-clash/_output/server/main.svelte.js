import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let things = $$props['things'];

		$$renderer.push(`<ul><!--[-->`);

		const each_array = $.ensure_array_like(things.foo);

		for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
			let foo = each_array[$$index];

			$$renderer.push(`<li>${$.escape(foo)}</li>`);
		}

		$$renderer.push(`<!--]--></ul>`);
		$.bind_props($$props, { things });
	});
}