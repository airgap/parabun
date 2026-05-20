import * as $ from 'svelte/internal/server';

export default function App($$renderer, $$props) {
	const $$sanitized_props = $.sanitize_props($$props);
	const $$restProps = $.rest_props($$sanitized_props, ['b', 'a', 'c']);

	$$renderer.component(($$renderer) => {
		let length, values;
		let a = $$props['a'];

		function b() {}

		let c = $.fallback($$props['c'], 1);

		$: length = Object.keys($$restProps).length;
		$: values = Object.values($$restProps);

		$$renderer.push(`<div>Length: ${$.escape(length)}</div> <div>Values: ${$.escape(values.join(','))}</div> <div${$.attributes({ ...$$restProps })}></div> <div${$.attributes({ ...$$sanitized_props })}></div>`);
		$.bind_props($$props, { a, c, b });
	});
}