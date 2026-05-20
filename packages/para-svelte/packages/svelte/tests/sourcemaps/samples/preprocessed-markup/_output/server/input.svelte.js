import * as $ from 'svelte/internal/server';

export default function Input($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let foo = $$props['foo'];

		$$renderer.push(`<!---->${$.escape(foo.bar.baz)}`);
		$.bind_props($$props, { foo });
	});
}