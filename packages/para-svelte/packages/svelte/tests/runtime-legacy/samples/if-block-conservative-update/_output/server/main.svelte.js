import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let fn = $$props['fn'];
		let foo = $$props['foo'];

		if (fn()) {
			$$renderer.push('<!--[0-->');
			$$renderer.push(`<p>${$.escape(foo)}</p>`);
		} else {
			$$renderer.push('<!--[-1-->');
		}

		$$renderer.push(`<!--]-->`);
		$.bind_props($$props, { fn, foo });
	});
}