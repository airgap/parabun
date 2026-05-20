import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';

export default function Child($$renderer) {
	var n;
	var $$promises = $$renderer.run([async () => n = await $.async_derived(() => 1)]);

	$$renderer.push(`<p>`);
	$$renderer.async([$$promises[0]], ($$renderer) => $$renderer.push(() => $.escape(n())));
	$$renderer.push(`</p>`);
}