Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/server';

function Main($$renderer, $$props) {
	$$renderer.component(
		($$renderer) => {
			let array = [{ a: 1, c: 2 }];

			$$renderer.push(`<!--[-->`);

			const each_array = $.ensure_array_like(array);

			for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
				let { a, b = c, c } = each_array[$$index];

				$$renderer.push(`<!---->${$.escape(a)}${$.escape(b)}${$.escape(c)}`);
			}

			$$renderer.push(`<!--]-->`);
		},
		Main
	);
}

Main.render = function () {
	throw new Error('Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information');
};

export default Main;