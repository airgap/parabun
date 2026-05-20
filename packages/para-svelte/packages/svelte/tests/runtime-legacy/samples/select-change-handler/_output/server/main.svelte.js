import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let selected = $$props['selected'];
	let options = $$props['options'];
	let lastChangedTo = $$props['lastChangedTo'];

	function updateLastChangedTo(result) {
		lastChangedTo = result;
	}

	$$renderer.select({ value: selected }, ($$renderer) => {
		$$renderer.push(`<!--[-->`);

		const each_array = $.ensure_array_like(options);

		for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
			let option = each_array[$$index];

			$$renderer.option({ value: option.id }, ($$renderer) => {
				$$renderer.push(`${$.escape(option.id)}`);
			});
		}

		$$renderer.push(`<!--]-->`);
	});

	$.bind_props($$props, { selected, options, lastChangedTo, updateLastChangedTo });
}