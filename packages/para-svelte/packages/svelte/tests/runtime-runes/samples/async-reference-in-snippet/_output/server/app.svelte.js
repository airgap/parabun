import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';

export default function App($$renderer) {
	var value;
	var $$promises = $$renderer.run([async () => value = await 'value']);

	function valueSnippet($$renderer) {
		$$renderer.push(`<!---->`);
		$$renderer.async([$$promises[0]], ($$renderer) => $$renderer.push(() => $.escape(value)));
	}

	valueSnippet($$renderer);
}