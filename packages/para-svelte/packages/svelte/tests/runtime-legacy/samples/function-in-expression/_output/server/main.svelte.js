import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let numbers = $$props['numbers'];

		$$renderer.push(`<!---->${$.escape(numbers.filter((x) => x % 2).join(', '))}`);
		$.bind_props($$props, { numbers });
	});
}