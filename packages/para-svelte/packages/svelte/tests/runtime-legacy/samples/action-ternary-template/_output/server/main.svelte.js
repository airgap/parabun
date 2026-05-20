import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let display = $$props['display'];
	let target = $$props['target'];

	function insert(node, text) {
		function onClick() {
			node.textContent = text;
		}

		node.addEventListener('click', onClick);

		return {
			destroy() {
				node.removeEventListener('click', onClick);
			}
		};
	}

	$$renderer.push(`<h1></h1>`);
	$.bind_props($$props, { display, target });
}