import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';
import Child from "./Child.svelte";

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		// Wait a macrotask to make sure the effect doesn't run before the microtask-Promise.resolve() resolves, masking a bug
		function createAttachment(value) {
			return () => {
				console.log(value);
			};
		}

		var attachment;

		var $$promises = $$renderer.run([
			() => new Promise((r) => setTimeout(r)),
			() => attachment = 'ready'
		]);

		$$renderer.push(`<div></div> `);

		$$renderer.async_block([$$promises[1]], ($$renderer) => {
			Child($$renderer, {});
		});
	});
}