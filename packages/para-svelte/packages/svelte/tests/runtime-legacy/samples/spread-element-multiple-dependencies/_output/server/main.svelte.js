import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let foo = $.fallback($$props['foo'], false);
	let a = $.fallback($$props['a'], 'a');
	let b = $.fallback($$props['b'], 'b');
	let bar = $.fallback($$props['bar'], () => ({ title: 'baz' }), true);

	$$renderer.push(`<div${$.attributes({ class: $.clsx(foo ? a : b), ...bar })}></div>`);
	$.bind_props($$props, { foo, a, b, bar });
}