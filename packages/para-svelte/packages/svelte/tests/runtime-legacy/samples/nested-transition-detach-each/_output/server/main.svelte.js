Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/server';

function Main($$renderer, $$props) {
	$$renderer.component(
		($$renderer) => {
			let visible = $$props['visible'];
			let rows = $$props['rows'];
			let cols = $$props['cols'];

			function foo(node) {
				return { duration: 100, tick: (t) => node.foo = t };
			}

			if (visible) {
				$$renderer.push('<!--[0-->');
				$$renderer.push(`<!--[-->`);

				const each_array = $.ensure_array_like(rows);

				for (let $$index_1 = 0, $$length = each_array.length; $$index_1 < $$length; $$index_1++) {
					let row = each_array[$$index_1];

					$$renderer.push(`<div class="row">`);
					$.push_element($$renderer, 'div', 16, 2);
					$$renderer.push(`<!--[-->`);

					const each_array_1 = $.ensure_array_like(cols);

					for (let $$index = 0, $$length = each_array_1.length; $$index < $$length; $$index++) {
						let col = each_array_1[$$index];

						$$renderer.push(`<div class="cell">`);
						$.push_element($$renderer, 'div', 18, 4);
						$$renderer.push(`${$.escape(row)}, ${$.escape(col)}</div>`);
						$.pop_element();
					}

					$$renderer.push(`<!--]--></div>`);
					$.pop_element();
				}

				$$renderer.push(`<!--]-->`);
			} else {
				$$renderer.push('<!--[-1-->');
			}

			$$renderer.push(`<!--]-->`);
			$.bind_props($$props, { visible, rows, cols });
		},
		Main
	);
}

Main.render = function () {
	throw new Error('Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information');
};

export default Main;