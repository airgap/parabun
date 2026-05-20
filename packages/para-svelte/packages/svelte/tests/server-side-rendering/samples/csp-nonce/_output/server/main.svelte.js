import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';
import { hydratable } from "svelte";

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		var foo;

		var $$promises = $$renderer.run([
			async () => foo = await hydratable('key', () => Promise.resolve('bar'))
		]);
	});
}