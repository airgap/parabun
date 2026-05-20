import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let foo = $.fallback($$props['foo'], '"></div><script>alert(42)</' + 'script>');
	let bar = $.fallback($$props['bar'], "'></div><script>alert(42)</" + 'script>');

	let props = $.fallback(
		$$props['props'],
		() => ({
			['"></div><script>alert(42)</' + 'script>']: 'baz',
			qux: '&&&'
		}),
		true
	);

	$$renderer.push(`<div${$.attributes({ foo, bar, ...props })}></div>`);
	$.bind_props($$props, { foo, bar, props });
}