import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let myClass = $$props['myClass'];
	let attributes = $.fallback($$props['attributes'], () => ({}), true);

	$$renderer.push(`<div${$.attributes({ class: $.clsx(myClass), ...attributes }, void 0, { three: true })}></div>`);
	$.bind_props($$props, { myClass, attributes });
}