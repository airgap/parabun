import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';

export default function Main($$renderer) {
	$.head('2c3u6r', $$renderer, ($$renderer) => {
		$$renderer.title(($$renderer) => {
			$$renderer.push(`<title>Some Title</title>`);
		});

		$$renderer.push(`<link rel="canonical" href="/"/> <meta name="description" content="some description"/> <meta name="keywords" content="some keywords"/>`);
	});

	$$renderer.push(`<div>Just a dummy page.</div>`);
}