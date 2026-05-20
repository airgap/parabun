import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';
import { route } from "./main.svelte";

export default function Child($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		var $$promises = $$renderer.run([
			() => new Promise(async (_, reject) => {
				route.reject = reject;
			})
		]);
	});
}