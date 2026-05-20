import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let x = $.fallback($$props['x'], 0);
	let y = $.fallback($$props['y'], 0);

	function tap(node, callback) {
		function clickHandler(event) {
			callback({ x: event.clientX, y: event.clientY });
		}

		node.addEventListener('click', clickHandler, false);

		return {
			destroy() {
				node.addEventListener('click', clickHandler, false);
			}
		};
	}

	$$renderer.push(`<button>${$.escape(x)}, ${$.escape(y)}</button>`);
	$.bind_props($$props, { x, y });
}