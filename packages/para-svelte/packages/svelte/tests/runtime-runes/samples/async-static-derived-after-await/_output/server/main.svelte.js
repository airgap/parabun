import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';

export default function Main($$renderer) {
	var message;
	var $$promises = $$renderer.run([() => 0, () => message = $.derived(() => 'hello')]);

	$$renderer.push(`<p>`);
	$$renderer.async([$$promises[1]], ($$renderer) => $$renderer.push(() => $.escape(message())));
	$$renderer.push(`</p>`);
}