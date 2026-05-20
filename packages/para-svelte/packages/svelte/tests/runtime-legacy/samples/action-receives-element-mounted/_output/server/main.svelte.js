import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let result = $$props['result'];

		function onMountAction(node) {
			result.parentElement = node.parentElement;
		}

		$$renderer.push(`<h1>Hello!</h1>`);
		$.bind_props($$props, { result });
	});
}