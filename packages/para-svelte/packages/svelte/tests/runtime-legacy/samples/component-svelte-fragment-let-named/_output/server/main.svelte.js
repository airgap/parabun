import * as $ from 'svelte/internal/server';
import Nested from './Nested.svelte';

export default function Main($$renderer, $$props) {
	let things = $$props['things'];

	Nested($$renderer, {
		things,
		$$slots: {
			foo: ($$renderer, { thing }) => {
				$$renderer.push(`<div slot="foo"><span>${$.escape(thing)}</span></div>`);
			}
		}
	});

	$.bind_props($$props, { things });
}