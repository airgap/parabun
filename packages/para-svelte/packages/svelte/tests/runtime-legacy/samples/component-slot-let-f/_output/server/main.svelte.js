import * as $ from 'svelte/internal/server';
import A from './A.svelte';

export default function Main($$renderer, $$props) {
	let x = $.fallback($$props['x'], 1);

	A($$renderer, {
		x,
		children: $.invalid_default_snippet,
		$$slots: {
			default: ($$renderer, { reflected }) => {
				$$renderer.push(`<span>${$.escape(reflected)}</span>`);
			}
		}
	});

	$.bind_props($$props, { x });
}