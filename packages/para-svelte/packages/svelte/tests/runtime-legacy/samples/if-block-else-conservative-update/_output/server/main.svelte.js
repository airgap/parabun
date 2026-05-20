import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let fn = $$props['fn'];
		let other_fn = $$props['other_fn'];
		let foo = $$props['foo'];

		if (fn(foo)) {
			$$renderer.push('<!--[0-->');
			$$renderer.push(`<p>${$.escape(foo)}</p>`);
		} else if (other_fn()) {
			$$renderer.push('<!--[1-->');
			$$renderer.push(`<p>${$.escape(foo.toUpperCase())}</p>`);
		} else {
			$$renderer.push('<!--[-1-->');
		}

		$$renderer.push(`<!--]-->`);
		$.bind_props($$props, { fn, other_fn, foo });
	});
}