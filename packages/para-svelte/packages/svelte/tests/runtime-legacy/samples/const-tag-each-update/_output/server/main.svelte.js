import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let items = $.fallback($$props['items'], () => ({ 0: { clicked: false }, length: 4 }), true);

		$$renderer.push(`<button>Show</button> <!--[-->`);

		const each_array = $.ensure_array_like(items);

		for (let i = 0, $$length = each_array.length; i < $$length; i++) {
			let item = each_array[i];
			const v_item = item;

			$$renderer.push(`<p>${$.escape(i)} `);

			if (v_item?.clicked) {
				$$renderer.push('<!--[0-->');
				$$renderer.push(`show (v_item)`);
			} else {
				$$renderer.push('<!--[-1-->');
			}

			$$renderer.push(`<!--]--> `);

			if (item?.clicked) {
				$$renderer.push('<!--[0-->');
				$$renderer.push(`show (item)`);
			} else {
				$$renderer.push('<!--[-1-->');
			}

			$$renderer.push(`<!--]--></p>`);
		}

		$$renderer.push(`<!--]-->`);
		$.bind_props($$props, { items });
	});
}