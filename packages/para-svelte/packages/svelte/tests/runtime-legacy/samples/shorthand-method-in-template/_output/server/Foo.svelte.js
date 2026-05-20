import * as $ from 'svelte/internal/server';

export default function Foo($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let bar = $$props['bar'];

		$$renderer.push(`<!---->${$.escape(bar.answer())}`);
		$.bind_props($$props, { bar });
	});
}