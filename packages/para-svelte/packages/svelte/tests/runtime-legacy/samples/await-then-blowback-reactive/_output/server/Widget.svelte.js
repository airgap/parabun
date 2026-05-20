import * as $ from 'svelte/internal/server';

export default function Widget($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let options = $.fallback($$props['options'], () => [], true);
		let index = $.fallback($$props['index'], 0);
		let value = $$props['value'];

		$: {
			value = options[index];
		}

		$$renderer.select({ value: index }, ($$renderer) => {
			$$renderer.push(`<!--[-->`);

			const each_array = $.ensure_array_like(options);

			for (let i = 0, $$length = each_array.length; i < $$length; i++) {
				let option = each_array[i];

				$$renderer.option({ value: i }, ($$renderer) => {
					$$renderer.push(`${$.escape(option)}`);
				});
			}

			$$renderer.push(`<!--]-->`);
		});

		$.bind_props($$props, { options, index, value });
	});
}