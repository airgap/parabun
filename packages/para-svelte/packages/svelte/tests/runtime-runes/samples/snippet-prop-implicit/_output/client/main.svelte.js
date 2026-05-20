import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';
import Counter from './Counter.svelte';

var root_1 = $.from_html(`<p> </p>`);

export default function Main($$anchor) {
	{
		const foo = ($$anchor, n = $.noop) => {
			var p = root_1();
			var text = $.child(p);

			$.reset(p);
			$.template_effect(() => $.set_text(text, `clicks: ${n() ?? ''}`));
			$.append($$anchor, p);
		};

		Counter($$anchor, { foo, $$slots: { foo: true } });
	}
}