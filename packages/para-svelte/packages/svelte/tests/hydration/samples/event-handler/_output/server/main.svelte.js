import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let clicked = $$props['clicked'];

	$$renderer.push(`<button>click me</button> `);

	if (clicked) {
		$$renderer.push('<!--[0-->');
		$$renderer.push(`<p>clicked!</p>`);
	} else {
		$$renderer.push('<!--[-1-->');
	}

	$$renderer.push(`<!--]-->`);
	$.bind_props($$props, { clicked });
}