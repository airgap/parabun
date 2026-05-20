import * as $ from 'svelte/internal/server';
import Widget from './Widget.svelte';

export default function Main($$renderer, $$props) {
	let foo = $.fallback($$props['foo'], 'foo');
	let i = 0;

	const getProps = (foo) => {
		i += 1;

		return { foo, i };
	};

	$$renderer.push(`<div>`);
	Widget($$renderer, $.spread_props([getProps(foo), { qux: 'named' }]));
	$$renderer.push(`<!----></div>`);
	$.bind_props($$props, { foo });
}