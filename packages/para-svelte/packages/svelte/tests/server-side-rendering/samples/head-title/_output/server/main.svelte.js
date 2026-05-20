import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let adjective = $$props['adjective'];

	$.head('1fw5l8c', $$renderer, ($$renderer) => {
		$$renderer.title(($$renderer) => {
			$$renderer.push(`<title>a ${$.escape(adjective)} title</title>`);
		});
	});

	$.bind_props($$props, { adjective });
}