import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/server';

function Main($$renderer, $$props) {
	$$renderer.component(
		($$renderer) => {
			let { ok = true } = $$props;

			function throwError() {
				throw new Error();
			}

			function throwErrorOnUpdate() {
				if (ok) {
					return "OK";
				} else {
					throwError();
				}
			}

			$.prevent_snippet_stringification(failed);

			function failed($$renderer) {
				$.validate_snippet_args($$renderer);
				$$renderer.push(`<p>`);
				$.push_element($$renderer, 'p', 21, 2);
				$$renderer.push(`BOOM</p>`);
				$.pop_element();
			}

			$.prevent_snippet_stringification(failed);

			function failed($$renderer) {
				$.validate_snippet_args($$renderer);
				$$renderer.push(`<p>`);
				$.push_element($$renderer, 'p', 30, 2);
				$$renderer.push(`BOOM</p>`);
				$.pop_element();
			}

			$.prevent_snippet_stringification(failed);

			function failed($$renderer) {
				$.validate_snippet_args($$renderer);
				$$renderer.push(`<p>`);
				$.push_element($$renderer, 'p', 38, 2);
				$$renderer.push(`BOOM</p>`);
				$.pop_element();
			}

			$.prevent_snippet_stringification(failed);

			function failed($$renderer) {
				$.validate_snippet_args($$renderer);
				$$renderer.push(`<p>`);
				$.push_element($$renderer, 'p', 47, 2);
				$$renderer.push(`BOOM</p>`);
				$.pop_element();
			}

			$$renderer.boundary({ failed }, ($$renderer) => {
				$$renderer.push(`<!--[-->`);

				{
					$$renderer.push(`<div>`);
					$.push_element($$renderer, 'div', 18, 1);
					$$renderer.push(`${$.escape(throwError())}</div>`);
					$.pop_element();
				}

				$$renderer.push(`<!--]-->`);
			});

			$$renderer.push(` `);

			$$renderer.boundary({ failed }, ($$renderer) => {
				$$renderer.push(`<!--[-->`);

				{
					const result = throwError();

					$$renderer.push(`<div>`);
					$.push_element($$renderer, 'div', 27, 1);
					$$renderer.push(`${$.escape(result)}</div>`);
					$.pop_element();
				}

				$$renderer.push(`<!--]-->`);
			});

			$$renderer.push(` `);

			$$renderer.boundary({ failed }, ($$renderer) => {
				$$renderer.push(`<!--[-->`);

				{
					$$renderer.push(`<div>`);
					$.push_element($$renderer, 'div', 35, 1);
					$$renderer.push(`${$.escape(throwErrorOnUpdate())}</div>`);
					$.pop_element();
				}

				$$renderer.push(`<!--]-->`);
			});

			$$renderer.push(` `);

			$$renderer.boundary({ failed }, ($$renderer) => {
				$$renderer.push(`<!--[-->`);

				{
					const result = throwErrorOnUpdate();

					$$renderer.push(`<div>`);
					$.push_element($$renderer, 'div', 44, 1);
					$$renderer.push(`${$.escape(result)}</div>`);
					$.pop_element();
				}

				$$renderer.push(`<!--]-->`);
			});
		},
		Main
	);
}

Main.render = function () {
	throw new Error('Component.render(...) is no longer valid in Svelte 5. See https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes for more information');
};

export default Main;