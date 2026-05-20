import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let z = $.fallback($$props['z'], 10);

	function tap(node, callback) {
		const clickHandler = (event) => {
			callback(event);
		};

		node.addEventListener('click', clickHandler, false);

		return {
			destroy() {
				node.addEventListener('click', clickHandler, false);
			}
		};
	}

	$$renderer.push(`<button>${$.escape(z)}</button>`);
	$.bind_props($$props, { z });
}