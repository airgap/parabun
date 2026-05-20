import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

export default function Main($$anchor) {
	const thing = {};

	$.head('70s021', ($$anchor) => {
		$.deferred_template_effect(() => {
			$.document.title = thing.thing ?? '';
		});
	});
}