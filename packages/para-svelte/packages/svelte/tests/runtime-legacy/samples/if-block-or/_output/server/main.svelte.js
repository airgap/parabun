import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let a = $$props['a'];
	let b = $$props['b'];

	if (a || b) {
		$$renderer.push('<!--[0-->');
		$$renderer.push(`<p>i am visible</p>`);
	} else {
		$$renderer.push('<!--[-1-->');
	}

	$$renderer.push(`<!--]-->`);
	$.bind_props($$props, { a, b });
}