import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let x = $$props['x'];

	$$renderer.push(`<!---->before-`);

	if (x > 10) {
		$$renderer.push('<!--[0-->');
		$$renderer.push(`if`);
	} else if (x < 5) {
		$$renderer.push('<!--[1-->');
		$$renderer.push(`elseif`);
	} else {
		$$renderer.push('<!--[-1-->');
		$$renderer.push(`else`);
	}

	$$renderer.push(`<!--]-->-after`);
	$.bind_props($$props, { x });
}