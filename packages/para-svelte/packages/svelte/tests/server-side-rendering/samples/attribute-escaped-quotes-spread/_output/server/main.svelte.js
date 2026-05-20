import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	const safe = { foo: 'foo' };
	const unsafe = { toString: () => '"><script>alert(42)<\/script>' };

	let props = $.fallback(
		$$props['props'],
		() => ({
			foo: '"></div><script>alert(42)</' + 'script>',
			bar: "'></div><script>alert(42)</" + 'script>',
			['"></div><script>alert(42)</' + 'script>']: 'baz',
			qux: '&&&',
			quux: unsafe
		}),
		true
	);

	$$renderer.push(`<div${$.attributes({ ...props })}></div> <div${$.attributes({ ...safe, unsafe })}></div>`);
	$.bind_props($$props, { props });
}