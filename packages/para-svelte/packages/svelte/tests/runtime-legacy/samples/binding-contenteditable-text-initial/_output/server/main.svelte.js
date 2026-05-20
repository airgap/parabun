import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let name = $$props['name'];

	$$renderer.push(`<editor contenteditable="true">`);

	const $$body = $.escape(name);

	if ($$body) {
		$$renderer.push(`${$$body}`);
	} else {
		$$renderer.push(`<b>world</b>`);
	}

	$$renderer.push(`</editor> <p>hello ${$.escape(name)}</p>`);
	$.bind_props($$props, { name });
}