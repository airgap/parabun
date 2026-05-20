import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		// Wait a macrotask to make sure the effect doesn't run before the microtask-Promise.resolve() resolves, masking a bug
		function run(_, arg) {
			console.log(arg);
		}

		var value;

		var $$promises = $$renderer.run([
			() => new Promise((r) => setTimeout(r)),
			() => value = 'ready'
		]);

		$$renderer.push(`<div></div>`);
	});
}