import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let array = $.fallback($$props['array'], () => ['a'], true);
	let visible = $.fallback($$props['visible'], true);

	function slide(_) {
		return { duration: 100, css: (t) => `opacity: ${t}` };
	}

	if (visible) {
		$$renderer.push('<!--[0-->');
		$$renderer.push(`<!--[-->`);

		const each_array = $.ensure_array_like(array);

		for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
			let item = each_array[$$index];

			$$renderer.push(`<div>${$.escape(item)}</div>`);
		}

		$$renderer.push(`<!--]-->`);
	} else {
		$$renderer.push('<!--[-1-->');
	}

	$$renderer.push(`<!--]--> `);

	if (!visible) {
		$$renderer.push('<!--[0-->');
	} else {
		$$renderer.push('<!--[-1-->');
		$$renderer.push(`<!--[-->`);

		const each_array_1 = $.ensure_array_like(array);

		for (let $$index_1 = 0, $$length = each_array_1.length; $$index_1 < $$length; $$index_1++) {
			let item = each_array_1[$$index_1];

			$$renderer.push(`<div>${$.escape(item)}</div>`);
		}

		$$renderer.push(`<!--]-->`);
	}

	$$renderer.push(`<!--]-->`);
	$.bind_props($$props, { array, visible });
}