Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/server';

function Main($$renderer, $$props) {
	$$renderer.component(
		($$renderer) => {
			const tags = [{ t: 'div', content: 'hello world' }, { t: 'input' }];

			$$renderer.push(`<!--[-->`);

			const each_array = $.ensure_array_like(tags);

			for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
				let tag = each_array[$$index];
				const $$tag = tag.t;

				$.validate_dynamic_element_tag(() => $$tag);
				$.validate_void_dynamic_element(() => $$tag);
				$$renderer.push(`<!---->${$.escape(tag.t)} <br/>`);
				$.push_element($$renderer, 'br', 6, 9);
				$.pop_element();
				$$renderer.push(` `);
				$.push_element($$renderer, $$tag, 7, 1);

				$.element($$renderer, $$tag, void 0, () => {
					if (tag.t !== 'input') {
						$$renderer.push('<!--[0-->');
						$$renderer.push(`${$.escape(tag.content)}`);
					} else {
						$$renderer.push('<!--[-1-->');
					}

					$$renderer.push(`<!--]-->`);
				});

				$.pop_element();
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