import * as $ from 'svelte/internal/server';
import Outer from './Outer.svelte';
import Inner from './Inner.svelte';

export default function Main($$renderer, $$props) {
	let prop = $$props['prop'];

	Outer($$renderer, {
		prop,
		$$slots: {
			main: ($$renderer, { value }) => {
				{
					Inner($$renderer, {
						$$slots: {
							main: ($$renderer) => {
								{
									$$renderer.push(`${$.escape(value)}`);
								}
							}
						}
					});
				}
			}
		}
	});

	$.bind_props($$props, { prop });
}