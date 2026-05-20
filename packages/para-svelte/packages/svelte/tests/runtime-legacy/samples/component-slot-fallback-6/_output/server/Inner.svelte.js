import * as $ from 'svelte/internal/server';
import Foo from './Foo.svelte';

export default function Inner($$renderer, $$props) {
	const $$sanitized_props = $.sanitize_props($$props);

	Foo($$renderer, {
		children: ($$renderer) => {
			$$renderer.push(`<!--[-->`);

			$.slot($$renderer, $$props, 'default', {}, () => {
				$$renderer.push(`${$.escape(JSON.stringify($$sanitized_props))}`);
			});

			$$renderer.push(`<!--]-->`);
		},
		$$slots: { default: true }
	});
}