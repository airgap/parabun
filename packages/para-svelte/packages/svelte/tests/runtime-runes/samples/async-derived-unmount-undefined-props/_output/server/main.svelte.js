import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';
import Child from './Child.svelte';

export default function Main($$renderer) {
	var // This async derived in parent triggers the bug
		something,
		active;

	var $$promises = $$renderer.run([
		async () => something = await $.async_derived(() => Promise.resolve('test')),
		() => active = 'some-id'
	]);

	$$renderer.async_block([$$promises[1]], ($$renderer) => {
		if (active) {
			$$renderer.push('<!--[0-->');

			$$renderer.async_block([$$promises[1]], ($$renderer) => {
				Child($$renderer, { id: active });
			});
		} else {
			$$renderer.push('<!--[-1-->');
		}
	});

	$$renderer.push(`<!--]--> <button>close</button>`);
}