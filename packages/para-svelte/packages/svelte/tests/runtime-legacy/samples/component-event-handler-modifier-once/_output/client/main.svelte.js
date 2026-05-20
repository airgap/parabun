import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Button from './Button.svelte';

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let count = $.prop($$props, 'count', 12, 0);

	var $$exports = {
		get count() {
			return count();
		},

		set count($$value) {
			count($$value);
			$.flush();
		}
	};

	Button($$anchor, {
		$$events: { click: $.once(() => count(count() + 1)) },
		children: ($$anchor, $$slotProps) => {
			$.next();

			var text = $.text();

			$.template_effect(() => $.set_text(text, count()));
			$.append($$anchor, text);
		},
		$$slots: { default: true }
	});

	return $.pop($$exports);
}