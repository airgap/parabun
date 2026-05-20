import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let name = $$props['name'];

	$$renderer.push(`<editor contenteditable="true">`);

	if (name) {
		$$renderer.push(`${name}`);
	} else {
		$$renderer.push(`<b>world</b>`);
	}

	$$renderer.push(`</editor> <p>hello ${$.html(name)}</p>`);
	$.bind_props($$props, { name });
}