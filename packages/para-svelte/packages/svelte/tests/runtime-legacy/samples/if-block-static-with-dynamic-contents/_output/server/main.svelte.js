import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	let foo = $$props['foo'];
	const show = () => true;

	if (show()) {
		$$renderer.push('<!--[0-->');
		$$renderer.push(`<p>${$.escape(foo)}</p>`);
	} else {
		$$renderer.push('<!--[-1-->');
	}

	$$renderer.push(`<!--]-->`);
	$.bind_props($$props, { foo });
}