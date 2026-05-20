import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		var $$promises = $$renderer.run([
			() => 1,
			() => {
				throw new Error('oops');
			}
		]);

		$$renderer.push(`<h1>hello</h1>`);
	});
}