import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/server';
import Test from './Test.svelte';

$.prevent_snippet_stringification(funBind);

function funBind($$renderer, context) {
	$.validate_snippet_args($$renderer);
	$$renderer.push(`<input/>`);
	$.push_element($$renderer, 'input', 31, 1);
	$.pop_element();
}

function Main($$renderer, $$props) {
	$$renderer.component(
		($$renderer) => {
			let { opacity = 0.5 } = $$props;
			let entries = [];
			let object = { items: null, group: [] };
			let elementFunBind = void 0;

			// should omit $.assign via static analysis
			const fixed = (node) => node.style.opacity = 0.5;

			// should use $.assign, but it should not warn
			const unknown = (node) => node.style.opacity = opacity;

			let $$settled = true;
			let $$inner_renderer;

			function $$render_inner($$renderer) {
				$$renderer.push(`<button>`);
				$.push_element($$renderer, 'button', 17, 0);
				$$renderer.push(`items: ${$.escape(JSON.stringify(object.items))}</button>`);
				$.pop_element();
				$$renderer.push(` <div>`);
				$.push_element($$renderer, 'div', 22, 0);
				$$renderer.push(`x</div>`);
				$.pop_element();
				$$renderer.push(` <input type="checkbox" value="1"${$.attr('checked', object.group.includes('1'), true)}/>`);
				$.push_element($$renderer, 'input', 23, 0);
				$.pop_element();
				$$renderer.push(` <input type="checkbox" value="2"${$.attr('checked', object.group.includes('2'), true)}/>`);
				$.push_element($$renderer, 'input', 24, 0);
				$.pop_element();
				$$renderer.push(` `);
				Test($$renderer, {});
				$$renderer.push(`<!----> `);
				Test($$renderer, {});
				$$renderer.push(`<!----> `);

				Test($$renderer, {
					get x() {
						return entries[3];
					},

					set x($$value) {
						entries[3] = $$value;
						$$settled = false;
					}
				});

				$$renderer.push(`<!----> `);

				funBind($$renderer, {
					set element(e) {
						elementFunBind = e;
					}
				});

				$$renderer.push(`<!----> <button>`);
				$.push_element($$renderer, 'button', 35, 0);
				$$renderer.push(`change opacity (fixed)</button>`);
				$.pop_element();
				$$renderer.push(` <button>`);
				$.push_element($$renderer, 'button', 36, 0);
				$$renderer.push(`change opacity (unknown)</button>`);
				$.pop_element();
			}

			do {
				$$settled = true;
				$$inner_renderer = $$renderer.copy();
				$$render_inner($$inner_renderer);
			} while (!$$settled);

			$$renderer.subsume($$inner_renderer);
		},
		Main
	);
}

Main.render = function () {
	throw new Error('Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information');
};

export default Main;