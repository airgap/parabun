import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let visible = $.fallback($$props['visible'], true);
	const empty = [];

	if (visible) {
		$$renderer.push('<!--[0-->');

		const each_array = $.ensure_array_like(empty);

		if (each_array.length !== 0) {
			$$renderer.push('<!--[-->');

			for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
				let item = each_array[$$index];

				$$renderer.push(`<p>${$.escape(item)}</p>`);
			}
		} else {
			$$renderer.push('<!--[!-->');
			$$renderer.push(`<p>nothing</p>`);
		}

		$$renderer.push(`<!--]--> <p>after</p>`);
	} else {
		$$renderer.push('<!--[-1-->');
	}

	$$renderer.push(`<!--]-->`);
	$.bind_props($$props, { visible });
}