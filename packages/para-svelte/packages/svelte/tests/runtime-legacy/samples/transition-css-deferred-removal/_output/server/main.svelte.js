import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let visible = $$props['visible'];

	function foo(node) {
		return {
			duration: 200,
			css: (t) => {
				return `opacity: ${t}`;
			}
		};
	}

	function bar(node) {
		return {
			duration: 100,
			css: (t) => {
				return `left: ${t * 100}px`;
			}
		};
	}

	if (visible) {
		$$renderer.push('<!--[0-->');
		$$renderer.push(`<span class="outer"><span class="inner">double transition</span></span>`);
	} else {
		$$renderer.push('<!--[-1-->');
	}

	$$renderer.push(`<!--]-->`);
	$.bind_props($$props, { visible });
}