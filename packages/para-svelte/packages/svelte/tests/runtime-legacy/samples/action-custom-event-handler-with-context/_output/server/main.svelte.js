import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let z = $.fallback($$props['z'], '???');
	let answer = $.fallback($$props['answer'], '42');

	function tap(node, callback) {
		const clickHandler = (event) => {
			callback({ answer });
		};

		node.addEventListener('click', clickHandler, false);

		return {
			destroy() {
				node.addEventListener('click', clickHandler, false);
			}
		};
	}

	$$renderer.push(`<button>${$.escape(z)}</button>`);
	$.bind_props($$props, { z, answer });
}