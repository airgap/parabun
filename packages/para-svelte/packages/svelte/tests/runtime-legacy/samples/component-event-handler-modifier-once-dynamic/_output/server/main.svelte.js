import * as $ from 'svelte/internal/server';
import Button from './Button.svelte';

export default function Main($$renderer, $$props) {
	let count = $.fallback($$props['count'], 0);
	let clickHandler = () => count += 1;

	function updateHandler() {
		clickHandler = () => count += 10;
	}

	$$renderer.push(`<button>update handler</button> `);

	Button($$renderer, {
		children: ($$renderer) => {
			$$renderer.push(`<!---->${$.escape(count)}`);
		},
		$$slots: { default: true }
	});

	$$renderer.push(`<!---->`);
	$.bind_props($$props, { count });
}