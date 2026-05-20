import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';
import { hydratable } from 'svelte';

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		var $$promises = $$renderer.run([
			() => hydratable('key', () => 'first'),
			() => hydratable('key', () => 'first')
		]);
	});
}