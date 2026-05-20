import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let condition = $$props['condition'];
	let foo = $$props['foo'];
	let bar = $$props['bar'];

	$.head('70s021', $$renderer, ($$renderer) => {
		if (condition) {
			$$renderer.push('<!--[0-->');
			$$renderer.push(`${$.html(foo)}`);
		} else {
			$$renderer.push('<!--[-1-->');
			$$renderer.push(`${$.html(bar)}`);
		}

		$$renderer.push(`<!--]-->`);
	});

	$.bind_props($$props, { condition, foo, bar });
}