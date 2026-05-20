import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

export default function App($$anchor) {
	const valueSnippet = ($$anchor) => {
		$.next();

		var text = $.text();

		$.template_effect(() => $.set_text(text, value), void 0, void 0, [$$promises[0]]);
		$.append($$anchor, text);
	};

	var value;
	var $$promises = $.run([async () => value = await 'value']);

	valueSnippet($$anchor);
}