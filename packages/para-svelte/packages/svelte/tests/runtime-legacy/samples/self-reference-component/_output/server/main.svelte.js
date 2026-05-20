import * as $ from 'svelte/internal/server';
import Countdown from './Countdown.svelte';

export default function Main($$renderer, $$props) {
	let count = $.fallback($$props['count'], 5);

	$$renderer.push(`<!---->${$.escape(count)} `);

	Countdown($$renderer, {
		count,
		children: $.invalid_default_snippet,
		$$slots: {
			default: ($$renderer, { count }) => {
				Main($$renderer, { count });
				$$renderer.push(`<!---->`);
			}
		}
	});

	$$renderer.push(`<!---->`);
	$.bind_props($$props, { count });
}