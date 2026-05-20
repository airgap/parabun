import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let visible = $$props['visible'];

	function foo() {
		return {
			duration: 100,
			css: (t) => {
				return `scale: ${t}`;
			}
		};
	}

	function bar() {
		return {
			duration: 100,
			css: (t) => {
				return `rotate: ${t * 360}deg; opacity: ${t}`;
			}
		};
	}

	if (visible) {
		$$renderer.push('<!--[0-->');
		$$renderer.push(`<div></div>`);
	} else {
		$$renderer.push('<!--[-1-->');
	}

	$$renderer.push(`<!--]-->`);
	$.bind_props($$props, { visible });
}