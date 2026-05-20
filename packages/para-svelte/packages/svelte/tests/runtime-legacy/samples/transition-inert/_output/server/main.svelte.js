import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let visible = $.fallback($$props['visible'], true);

	function slide(_, params) {
		return params;
	}

	if (visible) {
		$$renderer.push('<!--[0-->');
		$$renderer.push(`<button class="a">foo</button> <button class="b">bar</button>`);
	} else {
		$$renderer.push('<!--[-1-->');
	}

	$$renderer.push(`<!--]-->`);
	$.bind_props($$props, { visible });
}