import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let condition = $$props['condition'];

	$.head('70s021', $$renderer, ($$renderer) => {
		if (condition) {
			$$renderer.push('<!--[0-->');

			$$renderer.title(($$renderer) => {
				$$renderer.push(`<title>woo!!!</title>`);
			});
		} else {
			$$renderer.push('<!--[-1-->');
		}

		$$renderer.push(`<!--]-->`);
	});

	$.bind_props($$props, { condition });
}