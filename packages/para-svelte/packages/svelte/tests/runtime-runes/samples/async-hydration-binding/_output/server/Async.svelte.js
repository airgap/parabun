import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';

export default function Async($$renderer) {
	var data;

	var $$promises = $$renderer.run([
		async () => data = await $.async_derived(() => Promise.resolve('test'))
	]);

	$$renderer.async([$$promises[0]], ($$renderer) => {
		$$renderer.push(`<div${$.attr('data-resolved', data() ? 'true' : 'false')}>`);
		$$renderer.async([$$promises[0]], ($$renderer) => $$renderer.push(() => $.escape(data())));
		$$renderer.push(`</div>`);
	});
}