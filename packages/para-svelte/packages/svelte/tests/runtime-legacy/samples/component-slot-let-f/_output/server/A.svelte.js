import * as $ from 'svelte/internal/server';
import B from './B.svelte';

export default function A($$renderer, $$props) {
	let x = $$props['x'];

	B($$renderer, {
		x,
		children: $.invalid_default_snippet,
		$$slots: {
			default: ($$renderer, { reflected }) => {
				$$renderer.push(`<span>${$.escape(reflected)}</span> <!--[-->`);
				$.slot($$renderer, $$props, 'default', { reflected }, null);
				$$renderer.push(`<!--]-->`);
			}
		}
	});

	$.bind_props($$props, { x });
}