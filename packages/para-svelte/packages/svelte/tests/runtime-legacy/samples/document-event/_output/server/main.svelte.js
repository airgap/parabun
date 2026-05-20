import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let events = $.fallback($$props['events'], () => [], true);

		function log(event) {
			events.push(event);
		}

		$.bind_props($$props, { events });
	});
}