import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let visible = $.fallback($$props['visible'], false);
	let param = $.fallback($$props['param'], false);

	function getInParam() {
		return {
			duration: 100,
			css: (t) => {
				return `color: ${param ? 'red' : 'blue'}`;
			}
		};
	}

	function getOutParam() {
		return {
			duration: 100,
			css: (t) => {
				return `color: ${param ? 'green' : 'yellow'}`;
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
	$.bind_props($$props, { visible, param });
}