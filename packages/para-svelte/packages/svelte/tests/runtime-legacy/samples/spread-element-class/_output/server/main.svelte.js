import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let blah = $.fallback($$props['blah'], 'hello');

	$$renderer.push(`<div${$.attributes({ ...{ class: 'foo' } }, 'svelte-70s021', { bar: true })}>${$.escape(blah)}</div>`);
	$.bind_props($$props, { blah });
}