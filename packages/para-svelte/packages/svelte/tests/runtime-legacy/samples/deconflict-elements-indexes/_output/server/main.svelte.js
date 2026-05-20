import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let tagList = $.fallback($$props['tagList'], () => ['one'], true);

	function remove(index) {
		// ...
	}

	$$renderer.push(`<div><!--[-->`);

	const each_array = $.ensure_array_like(tagList);

	for (let i = 0, $$length = each_array.length; i < $$length; i++) {
		let tag = each_array[i];

		$$renderer.push(`<i>${$.escape(tag)}</i>`);
	}

	$$renderer.push(`<!--]--></div>`);
	$.bind_props($$props, { tagList });
}