import * as $ from 'svelte/internal/server';
import { onDestroy } from 'svelte';

export default function Component($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let my_prop = $$props['my_prop'];

		onDestroy(() => {
			console.log(my_prop.foo);
		});

		$$renderer.push(`<!---->${$.escape(my_prop.foo)}`);
		$.bind_props($$props, { my_prop });
	});
}