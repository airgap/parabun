import * as $ from 'svelte/internal/server';
import Widget from './Widget.svelte';

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let bar = $$props['bar'];
		let x = $$props['x'];
		let compound = $$props['compound'];
		let go = $$props['go'];

		$$renderer.push(`<div>`);

		Widget($$renderer, {
			foo: bar,
			baz: 40 + x,
			qux: `this is a ${$.stringify(compound)} string`,
			quux: go.deeper
		});

		$$renderer.push(`<!----></div>`);
		$.bind_props($$props, { bar, x, compound, go });
	});
}