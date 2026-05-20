import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let value = $$props['value'];

	$$renderer.push(`<textarea>`);

	const $$body = $.escape(value);

	if ($$body) {
		$$renderer.push(`${$$body}`);
	} else {}

	$$renderer.push(`</textarea> <p>${$.escape(value)}</p>`);
	$.bind_props($$props, { value });
}