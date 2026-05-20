import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let adjective = $$props['adjective'];

	$.head('70s021', $$renderer, ($$renderer) => {
		$$renderer.title(($$renderer) => {
			$$renderer.push(`<title>a ${$.escape(adjective)} title</title>`);
		});

		$$renderer.push(`<meta name="twitter:creator" content="@sveltejs"/>`);
	});

	$.bind_props($$props, { adjective });
}