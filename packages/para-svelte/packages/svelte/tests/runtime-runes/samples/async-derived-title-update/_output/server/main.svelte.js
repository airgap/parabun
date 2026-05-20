import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';

export default function Main($$renderer) {
	let promise = Promise.resolve('hello');
	var value;
	var $$promises = $$renderer.run([async () => value = await $.async_derived(() => promise)]);

	$.head('70s021', $$renderer, ($$renderer) => {
		$$renderer.title(($$renderer) => {
			$$renderer.push(`<title>`);
			$$renderer.async([$$promises[0]], ($$renderer) => $$renderer.push(() => $.escape(value())));
			$$renderer.push(`</title>`);
		});
	});

	$$renderer.push(`<p>`);
	$$renderer.async([$$promises[0]], ($$renderer) => $$renderer.push(() => $.escape(value())));
	$$renderer.push(`</p>`);
}