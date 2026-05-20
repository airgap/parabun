import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let tag = $.fallback($$props['tag'], "h1");
	let visible = $$props['visible'];

	function foo() {
		return {
			duration: 100,
			css: (t) => {
				return `opacity: ${t}`;
			}
		};
	}

	if (visible) {
		$$renderer.push('<!--[0-->');
		$.element($$renderer, tag);
	} else {
		$$renderer.push('<!--[-1-->');
	}

	$$renderer.push(`<!--]-->`);
	$.bind_props($$props, { tag, visible });
}