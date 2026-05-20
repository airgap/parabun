import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';

export default function Main($$renderer) {
	$.element($$renderer, 'custom-element', () => {
		$$renderer.push(` class="red svelte-70s021"`);
	});

	$$renderer.push(` <custom-element class="red svelte-70s021"></custom-element>`);
}