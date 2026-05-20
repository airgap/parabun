import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';

export default function Child($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { id } = $$props;

		var // BUG: This logs 'undefined' on unmount when parent has async derived
		data;

		var $$promises = $$renderer.run([
			async () => data = await $.async_derived(() => Promise.resolve(id).then((x) => {
				console.log('promise resolved with:', x);

				return x;
			}))
		]);
	});
}