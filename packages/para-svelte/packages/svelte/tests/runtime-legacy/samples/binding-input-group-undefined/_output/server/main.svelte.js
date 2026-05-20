import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let values = $.fallback($$props['values'], () => ({ inner: [] }), true);

		$$renderer.push(`<input type="checkbox" value="first"${$.attr('checked', values.inner.includes('first'), true)}/> <input type="checkbox" value="second"${$.attr('checked', values.inner.includes('second'), true)}/> <input type="checkbox" value="third"${$.attr('checked', values.inner.includes('third'), true)}/> <div><!--[-->`);

		const each_array = $.ensure_array_like(['first', 'second', 'third']);

		for (let $$index = 0, $$length = each_array.length; $$index < $$length; $$index++) {
			let k = each_array[$$index];

			$$renderer.push(`<span>${$.escape(k)}</span>`);
		}

		$$renderer.push(`<!--]--></div>`);
		$.bind_props($$props, { values });
	});
}