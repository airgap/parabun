import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';
import Counter from "./Counter.svelte";

var root_2 = $.from_html(`<p slot="named"></p>`);

export default function Main($$anchor) {
	let count = 'not state';

	Counter($$anchor, {
		children: $.invalid_default_snippet,
		$$slots: {
			default: ($$anchor, $$slotProps) => {
				const count = $.derived(() => $$slotProps.count);

				$.next();

				var text = $.text();

				$.template_effect(() => $.set_text(text, $.get(count)));
				$.append($$anchor, text);
			},

			named: ($$anchor, $$slotProps) => {
				var p = root_2();

				p.textContent = 'named slot count is not state';
				$.append($$anchor, p);
			}
		}
	});
}