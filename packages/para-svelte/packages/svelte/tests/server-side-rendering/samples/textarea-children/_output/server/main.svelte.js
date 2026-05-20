import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let foo = $.fallback($$props['foo'], 42);

	$$renderer.push(`<textarea>`);

	const $$body = $.escape(`	<p>not actually an element. ${$.stringify(foo)}</p>
`);

	if ($$body) {
		$$renderer.push(`${$$body}`);
	} else {}

	$$renderer.push(`</textarea>`);
	$.bind_props($$props, { foo });
}