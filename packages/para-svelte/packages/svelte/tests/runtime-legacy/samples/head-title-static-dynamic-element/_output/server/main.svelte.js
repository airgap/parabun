import * as $ from 'svelte/internal/server';

export default function Main($$renderer) {
	let x = 'sveltejs';

	$.head('70s021', $$renderer, ($$renderer) => {
		$$renderer.title(($$renderer) => {
			$$renderer.push(`<title>changed</title>`);
		});

		$$renderer.push(`<meta name="twitter:creator"${$.attr('content', `@${$.stringify(x)}`)}/>`);
	});
}