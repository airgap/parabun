import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let numbers = $.fallback($$props['numbers'], () => [1, 2, 3], true);
		const square = (num) => num * num;

		$$renderer.push(`<p>${$.escape(numbers.map(square))}</p>`);
		$.bind_props($$props, { numbers });
	});
}