import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Outer from './Outer.svelte';

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let text = $.prop($$props, 'text', 12, 'one');

	var $$exports = {
		get text() {
			return text();
		},

		set text($$value) {
			text($$value);
			$.flush();
		}
	};

	Outer($$anchor, {
		children: ($$anchor, $$slotProps) => {
			$.next();

			var text_1 = $.text();

			$.template_effect(() => $.set_text(text_1, text()));
			$.append($$anchor, text_1);
		},
		$$slots: { default: true }
	});

	return $.pop($$exports);
}