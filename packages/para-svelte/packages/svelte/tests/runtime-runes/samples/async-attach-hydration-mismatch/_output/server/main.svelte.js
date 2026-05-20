import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';
import Outer from './Outer.svelte';
import Inner from './Inner.svelte';
import Trigger from './Trigger.svelte';

export default function Main($$renderer) {
	var data, trigger;

	var $$promises = $$renderer.run([
		async () => data = await $.async_derived(() => Promise.resolve(['a', 'b'])),
		() => trigger = void 0
	]);

	Outer($$renderer, {
		children: ($$renderer) => {
			$$renderer.async_block([$$promises[1]], ($$renderer) => {
				Inner($$renderer, {
					children: ($$renderer) => {
						$$renderer.push(`<!---->foo`);
					},
					$$slots: { default: true }
				});
			});
		},
		$$slots: { default: true }
	});

	$$renderer.push(`<!----> `);

	$$renderer.async_block([$$promises[1]], ($$renderer) => {
		Trigger($$renderer, {});
	});
}