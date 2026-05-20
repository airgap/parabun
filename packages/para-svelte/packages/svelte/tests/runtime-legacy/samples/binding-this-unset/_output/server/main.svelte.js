import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let foo = $$props['foo'];
	let x = $$props['x'];

	if (x) {
		$$renderer.push('<!--[0-->');
		$$renderer.push(`<canvas data-x="true"></canvas>`);
	} else {
		$$renderer.push('<!--[-1-->');
		$$renderer.push(`<canvas data-x="false"></canvas>`);
	}

	$$renderer.push(`<!--]-->`);
	$.bind_props($$props, { foo, x });
}