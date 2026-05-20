import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let array = $.fallback($$props['array'], () => [1], true);

		function append(value) {
			array.push(value);
			array = array;
		}

		$$renderer.push(`<!---->`);

		{
			$$renderer.push(`<div>${$.escape(array.join(','))}</div>`);
		}

		$$renderer.push(`<!---->`);
		$.bind_props($$props, { array, append });
	});
}