import * as $ from 'svelte/internal/server';
import Widget from './Widget.svelte';

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let a = $.fallback($$props['a'], () => [{ name: 'foo' }, { name: 'bar' }, { name: 'baz' }], true);
		let getName = $.fallback($$props['getName'], (x) => x.name);
		let $$settled = true;
		let $$inner_renderer;

		function $$render_inner($$renderer) {
			$$renderer.push(`<!--[-->`);

			const each_array = $.ensure_array_like(a);

			for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
				let x = each_array[$$index];

				Widget($$renderer, {
					get value() {
						return x.name;
					},

					set value($$value) {
						x.name = $$value;
						$$settled = false;
					}
				});
			}

			$$renderer.push(`<!--]--> <p>${$.escape(a.map(getName).join(', '))}</p>`);
		}

		do {
			$$settled = true;
			$$inner_renderer = $$renderer.copy();
			$$render_inner($$inner_renderer);
		} while (!$$settled);

		$$renderer.subsume($$inner_renderer);
		$.bind_props($$props, { a, getName });
	});
}