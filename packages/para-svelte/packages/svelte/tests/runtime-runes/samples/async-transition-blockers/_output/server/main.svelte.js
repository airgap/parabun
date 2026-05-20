import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		// Wait a macrotask to make sure the effect doesn't run before the microtask-Promise.resolve() resolves, masking a bug
		function custom(_, value) {
			console.log(value);

			return { duration: 0 };
		}

		var params;

		var $$promises = $$renderer.run([
			() => new Promise((r) => setTimeout(r)),
			() => params = 'ready'
		]);

		$$renderer.push(`<div></div>`);
	});
}