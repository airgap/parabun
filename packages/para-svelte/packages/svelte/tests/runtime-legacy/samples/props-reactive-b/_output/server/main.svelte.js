import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	const $$sanitized_props = $.sanitize_props($$props);

	$$renderer.component(($$renderer) => {
		let c;
		let a = $$props['a'];

		$: c = a + $$sanitized_props.b;

		$$renderer.push(`<p>a: ${$.escape(a)}</p> <p>b: ${$.escape($$sanitized_props.b)}</p> <p>c: ${$.escape(c)}</p>`);
		$.bind_props($$props, { a });
	});
}