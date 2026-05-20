import * as $ from 'svelte/internal/server';

export default function Nested($$renderer, $$props) {
	const $$sanitized_props = $.sanitize_props($$props);
	let props;

	$: {
		let { foo, bar, baz, ...others } = $$sanitized_props;

		props = others;
	}

	$$renderer.push(`<p>${$.escape(props.qux)}</p>`);
}