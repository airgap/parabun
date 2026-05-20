import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let x = $.fallback($$props['x'], 0);

	function foo(node) {
		const handler = () => {
			x += 1;
		};

		node.addEventListener('click', handler);
		handler();

		return {
			destroy() {
				node.removeEventListener('click', handler);
			}
		};
	}

	$$renderer.push(`<button>${$.escape(x)}</button>`);
	$.bind_props($$props, { x });
}