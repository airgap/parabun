import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';
import Child from './Child.svelte';

var root_1 = $.from_html(`<p> </p>`);

export default function Main($$anchor) {
	let message = 'hello';

	Child($$anchor, {
		message,
		children: $.invalid_default_snippet,
		$$slots: {
			default: ($$anchor, $$slotProps) => {
				const message = $.derived(() => $$slotProps.message);
				var p = root_1();
				var text = $.child(p);

				$.reset(p);
				$.template_effect(() => $.set_text(text, `message: ${$.get(message) ?? ''}`));
				$.append($$anchor, p);
			}
		}
	});
}