import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

export default function Main($$anchor) {
	$.head('70s021', ($$anchor) => {
		$.effect(() => {
			$.document.title = '';
		});
	});
}