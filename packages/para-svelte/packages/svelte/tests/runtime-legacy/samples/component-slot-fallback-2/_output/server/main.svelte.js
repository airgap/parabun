import * as $ from 'svelte/internal/server';
import Outer from "./Outer.svelte";
import Inner from "./Inner.svelte";
import { model } from "./store.svelte";

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let props = $.fallback($$props['props'], '');
		let fallback = $.fallback($$props['fallback'], '');

		function getSubscriberCount() {
			return model.getCount();
		}

		Outer($$renderer, {
			slotProps: props,
			defaultValue: fallback,
			children: $.invalid_default_snippet,
			$$slots: {
				default: ($$renderer, { slotProps }) => {
					Inner($$renderer, { value: slotProps });
				}
			}
		});

		$$renderer.push(`<!----> `);

		Outer($$renderer, {
			slotProps: props,
			defaultValue: fallback,
			children: $.invalid_default_snippet,
			$$slots: {
				default: ($$renderer, { slotProps }) => {
					Inner($$renderer, { value: slotProps });
				}
			}
		});

		$$renderer.push(`<!----> `);
		Outer($$renderer, { slotProps: props, defaultValue: fallback });
		$$renderer.push(`<!---->`);
		$.bind_props($$props, { props, fallback, getSubscriberCount });
	});
}