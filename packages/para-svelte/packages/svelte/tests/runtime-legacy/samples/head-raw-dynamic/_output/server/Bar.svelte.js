import * as $ from 'svelte/internal/server';

export default function Bar($$renderer, $$props) {
	let bar = $$props['bar'];

	$.head('n50t4b', $$renderer, ($$renderer) => {
		$$renderer.title(($$renderer) => {
			$$renderer.push(`<title>bar!!!</title>`);
		});

		$$renderer.push(`<meta id="meta" name="title" content="bar!!!"/> `);

		if (true) {
			$$renderer.push('<!--[0-->');
			$$renderer.push(`${$.html(bar)}`);
		} else {
			$$renderer.push('<!--[-1-->');
		}

		$$renderer.push(`<!--]-->`);
	});

	$.bind_props($$props, { bar });
}