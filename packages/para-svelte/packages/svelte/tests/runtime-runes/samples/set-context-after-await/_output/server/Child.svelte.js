import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';
import { setContext } from 'svelte';

export default function Child($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		var $$promises = $$renderer.run([
			() => Promise.resolve(),
			() => {
				try {
					setContext('potato', {});
				} catch(e) {
					console.log(e.message);
				}
			}
		]);
	});
}