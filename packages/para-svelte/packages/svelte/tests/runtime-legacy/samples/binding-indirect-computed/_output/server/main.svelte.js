Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/server';

function Main($$renderer, $$props) {
	$$renderer.component(
		($$renderer) => {
			let letters = $.fallback($$props['letters'], () => ['a', 'b', 'c'], true);
			let selected = $.fallback($$props['selected'], () => ({ letter: '' }), true);

			function uppercase() {
				return letters.map((x) => x.toUpperCase());
			}

			$$renderer.select({ value: selected.letter }, ($$renderer) => {
				$$renderer.push(`<!--[-->`);

				const each_array = $.ensure_array_like(uppercase());

				for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
					let letter = each_array[$$index];

					$$renderer.option({ value: letter }, ($$renderer) => {
						$.push_element($$renderer, 'option', 18, 2);
						$$renderer.push(`${$.escape(letter)}`);
						$.pop_element();
					});
				}

				$$renderer.push(`<!--]-->`);
			});

			$$renderer.push(` ${$.escape(selected.letter)}`);
			$.bind_props($$props, { letters, selected });
		},
		Main
	);
}

Main.render = function () {
	throw new Error('Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information');
};

export default Main;