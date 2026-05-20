import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';
import { setContext } from 'svelte';

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		var $$promises = $$renderer.run([
			() => Promise.resolve('hi'),
			() => void setContext('key', 'value')
		]);
	});
}