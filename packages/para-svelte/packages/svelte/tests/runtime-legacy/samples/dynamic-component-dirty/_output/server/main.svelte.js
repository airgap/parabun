import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let current_path = $.fallback($$props['current_path'], 'foo');
		let calls = $$props['calls'];
		let i = 0;

		function getComponent(path) {
			calls.push(path);

			return null;
		}

		function onClick() {
			i = i + 1;
		}

		if (getComponent(current_path)) {
			$$renderer.push('<!--[-->');
			getComponent(current_path)($$renderer, {});
			$$renderer.push('<!--]-->');
		} else {
			$$renderer.push('<!--[!-->');
			$$renderer.push('<!--]-->');
		}

		$$renderer.push(` <button>click me</button> ${$.escape(i)}`);
		$.bind_props($$props, { current_path, calls });
	});
}