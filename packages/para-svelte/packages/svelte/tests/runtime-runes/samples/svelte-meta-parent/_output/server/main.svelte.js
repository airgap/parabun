import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/server';
import Child from "./child.svelte";
import Passthrough from "./passthrough.svelte";

function Main($$renderer, $$props) {
	$$renderer.component(
		($$renderer) => {
			let x = { y: Child };
			let key = 'test';
			let show = true;

			$$renderer.push(`<p>`);
			$.push_element($$renderer, 'p', 9, 0);
			$$renderer.push(`no parent</p>`);
			$.pop_element();
			$$renderer.push(` <button>`);
			$.push_element($$renderer, 'button', 10, 0);
			$$renderer.push(`toggle</button>`);
			$.pop_element();
			$$renderer.push(` `);

			if (true) {
				$$renderer.push('<!--[0-->');
				$$renderer.push(`<p>`);
				$.push_element($$renderer, 'p', 13, 1);
				$$renderer.push(`if</p>`);
				$.pop_element();
			} else {
				$$renderer.push('<!--[-1-->');
			}

			$$renderer.push(`<!--]--> <!--[-->`);

			const each_array = $.ensure_array_like([1]);

			for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
				$$renderer.push(`<p>`);
				$.push_element($$renderer, 'p', 17, 1);
				$$renderer.push(`each</p>`);
				$.pop_element();
			}

			$$renderer.push(`<!--]--> `);

			$.await(
				$$renderer,
				Promise.resolve(),
				() => {
					$$renderer.push(`<p>`);
					$.push_element($$renderer, 'p', 21, 1);
					$$renderer.push(`loading</p>`);
					$.pop_element();
				},
				() => {
					$$renderer.push(`<p>`);
					$.push_element($$renderer, 'p', 23, 1);
					$$renderer.push(`await</p>`);
					$.pop_element();
				}
			);

			$$renderer.push(`<!--]--> <!---->`);

			{
				$$renderer.push(`<p>`);
				$.push_element($$renderer, 'p', 27, 1);
				$$renderer.push(`key</p>`);
				$.pop_element();
			}

			$$renderer.push(`<!----> `);
			Child($$renderer, {});
			$$renderer.push(`<!----> `);

			Passthrough($$renderer, {
				children: $.prevent_snippet_stringification(($$renderer) => {
					Child($$renderer, {});
				}),
				$$slots: { default: true }
			});

			$$renderer.push(`<!----> `);

			Passthrough($$renderer, {
				children: $.prevent_snippet_stringification(($$renderer) => {
					Passthrough($$renderer, {
						children: $.prevent_snippet_stringification(($$renderer) => {
							Child($$renderer, {});
						}),
						$$slots: { default: true }
					});
				}),
				$$slots: { default: true }
			});

			$$renderer.push(`<!----> `);

			if (show) {
				$$renderer.push('<!--[0-->');

				{
					$.prevent_snippet_stringification(named);

					function named($$renderer) {
						$.validate_snippet_args($$renderer);
						$$renderer.push(`<p>`);
						$.push_element($$renderer, 'p', 45, 3);
						$$renderer.push(`hi</p>`);
						$.pop_element();
					}

					Passthrough($$renderer, { named, $$slots: { named: true } });
				}
			} else {
				$$renderer.push('<!--[-1-->');
			}

			$$renderer.push(`<!--]--> `);

			if (x.y) {
				$$renderer.push('<!--[-->');
				x.y($$renderer, {});
				$$renderer.push('<!--]-->');
			} else {
				$$renderer.push('<!--[!-->');
				$$renderer.push('<!--]-->');
			}
		},
		Main
	);
}

Main.render = function () {
	throw new Error('Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information');
};

export default Main;