import * as $ from 'svelte/internal/server';

export default function Main($$renderer) {
	$.head('70s021', $$renderer, ($$renderer) => {
		$$renderer.title(($$renderer) => {
			$$renderer.push(`<title></title>`);
		});
	});
}