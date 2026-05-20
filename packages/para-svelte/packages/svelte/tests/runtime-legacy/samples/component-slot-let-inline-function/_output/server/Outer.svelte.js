import * as $ from 'svelte/internal/server';
import Inner from './Inner.svelte';

export default function Outer($$renderer, $$props) {
	let log = $$props['log'];
	let a = $$props['a'];
	let b = $$props['b'];

	Inner($$renderer, {
		log,
		b,
		$$slots: {
			inner_slot: ($$renderer, { innerCall }) => {
				{
					$$renderer.push(`<!--[-->`);
					$.slot($$renderer, $$props, 'default', { outerCall: () => innerCall(a) }, null);
					$$renderer.push(`<!--]-->`);
				}
			}
		}
	});

	$.bind_props($$props, { log, a, b });
}