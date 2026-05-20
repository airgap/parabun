import * as $ from 'svelte/internal/server';
import B from './B.svelte';

export default function A($$renderer, $$props) {
	let x = $$props['x'];

	B($$renderer, {
		x,
		$$slots: {
			main: ($$renderer, { reflected }) => {
				{
					$$renderer.push(`<span>${$.escape(reflected)}</span> <!--[-->`);
					$.slot($$renderer, $$props, 'main', { reflected }, null);
					$$renderer.push(`<!--]-->`);
				}
			}
		}
	});

	$.bind_props($$props, { x });
}