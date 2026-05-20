import * as $ from 'svelte/internal/server';

export default function A($$renderer) {
	$.head('1lj1c2h', $$renderer, ($$renderer) => {
		$$renderer.push(`<meta name="description" content="A"/>`);
	});

	$$renderer.push(`<!---->A`);
}