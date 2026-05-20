import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let tree = $$props['tree'];

	$$renderer.push(`<!--[-->`);

	const each_array = $.ensure_array_like(tree);

	for (let i = 0, $$length = each_array.length; i < $$length; i++) {
		let item = each_array[i];

		$$renderer.push(`<div>${$.escape(item.id)} `);

		if (item.sub) {
			$$renderer.push('<!--[0-->');
			Main($$renderer, { tree: item.sub });
			$$renderer.push(`<!---->`);
		} else {
			$$renderer.push('<!--[-1-->');
		}

		$$renderer.push(`<!--]--></div>`);
	}

	$$renderer.push(`<!--]-->`);
	$.bind_props($$props, { tree });
}