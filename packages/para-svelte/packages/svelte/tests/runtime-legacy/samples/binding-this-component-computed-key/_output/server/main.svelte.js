import * as $ from 'svelte/internal/server';
import Foo from './Foo.svelte';

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let foo = $.fallback($$props['foo'], () => ({}), true);

		Foo($$renderer, {});
		$$renderer.push(`<!----> <div>has foo: ${$.escape(!!foo.computed)}</div>`);
		$.bind_props($$props, { foo });
	});
}