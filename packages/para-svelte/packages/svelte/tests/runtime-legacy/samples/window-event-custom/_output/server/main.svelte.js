import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let escaped = $.fallback($$props['escaped'], false);

	function esc(node, callback) {
		function onKeyDown(event) {
			if (event.key === 'Escape') callback(event);
		}

		node.addEventListener('keydown', onKeyDown);

		return {
			destroy() {
				node.removeEventListener('keydown', onKeyDown);
			}
		};
	}

	$$renderer.push(`<p>escaped: ${$.escape(escaped)}</p>`);
	$.bind_props($$props, { escaped });
}