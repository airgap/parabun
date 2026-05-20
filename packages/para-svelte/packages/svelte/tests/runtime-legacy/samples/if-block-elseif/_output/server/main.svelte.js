import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let x = $$props['x'];

	if (x > 10) {
		$$renderer.push('<!--[0-->');
		$$renderer.push(`<p>x is greater than 10</p>`);
	} else if (x < 5) {
		$$renderer.push('<!--[1-->');
		$$renderer.push(`<p>x is less than 5</p>`);
	} else {
		$$renderer.push('<!--[-1-->');
		$$renderer.push(`<p>x is between 5 and 10</p>`);
	}

	$$renderer.push(`<!--]-->`);
	$.bind_props($$props, { x });
}