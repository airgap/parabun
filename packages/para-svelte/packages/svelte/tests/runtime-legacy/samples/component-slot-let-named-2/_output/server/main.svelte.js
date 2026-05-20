import * as $ from 'svelte/internal/server';
import Nested from './Nested.svelte';
import SlotInner from './SlotInner.svelte';

export default function Main($$renderer, $$props) {
	let things = $$props['things'];

	Nested($$renderer, {
		things,
		$$slots: {
			foo: ($$renderer, { thing: data }) => {
				SlotInner($$renderer, {
					slot: 'foo',
					thing: data,
					children: ($$renderer) => {
						$$renderer.push(`<div class="inner-slot">${$.escape(data)}</div>`);
					},
					$$slots: { default: true }
				});
			}
		}
	});

	$.bind_props($$props, { things });
}