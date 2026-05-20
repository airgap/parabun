import * as $ from 'svelte/internal/server';
import Outer from './Outer.svelte';
import Inner from './Inner.svelte';

export default function Main($$renderer, $$props) {
	let prop = $$props['prop'];

	Outer($$renderer, {
		prop,
		children: $.invalid_default_snippet,
		$$slots: {
			default: ($$renderer, { value }) => {
				Inner($$renderer, {
					children: ($$renderer) => {
						$$renderer.push(`<!---->${$.escape(value)}`);
					},
					$$slots: { default: true }
				});
			}
		}
	});

	$.bind_props($$props, { prop });
}