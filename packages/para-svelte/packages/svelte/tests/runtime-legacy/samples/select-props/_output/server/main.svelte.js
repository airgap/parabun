import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let foo = $.fallback($$props['foo'], () => [1, 2], true);
		let log = $.fallback($$props['log'], () => [], true);

		function handler(bar) {
			log = log.concat(bar);
		}

		$$renderer.push(`<!--[-->`);

		const each_array = $.ensure_array_like(foo);

		for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
			let bar = each_array[$$index];

			$$renderer.push(`<select>`);

			$$renderer.option({}, ($$renderer) => {
				$$renderer.push(`a`);
			});

			$$renderer.option({}, ($$renderer) => {
				$$renderer.push(`b`);
			});

			$$renderer.push(`</select>`);
		}

		$$renderer.push(`<!--]-->`);
		$.bind_props($$props, { foo, log, handler });
	});
}