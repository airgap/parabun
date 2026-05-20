import * as $ from 'svelte/internal/server';

export default function Select($$renderer, $$props) {
	const $$sanitized_props = $.sanitize_props($$props);
	const $$restProps = $.rest_props($$sanitized_props, ['options', 'value', 'label']);
	let options = $.fallback($$props['options'], () => [], true);
	let value = $.fallback($$props['value'], "");
	let label = $.fallback($$props['label'], "");

	$$renderer.select({ value, ...$$restProps }, ($$renderer) => {
		$$renderer.push(`<!--[-->`);

		const each_array = $.ensure_array_like(options);

		for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
			let option = each_array[$$index];

			$$renderer.option({}, option);
		}

		$$renderer.push(`<!--]-->`);
	});

	$$renderer.push(` <p>${$.escape(label)}</p>`);
	$.bind_props($$props, { options, value, label });
}