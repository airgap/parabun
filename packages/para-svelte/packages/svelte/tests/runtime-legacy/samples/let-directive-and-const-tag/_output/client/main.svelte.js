import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Component from './component.svelte';

export default function Main($$anchor) {
	Component($$anchor, {
		children: $.invalid_default_snippet,
		$$slots: {
			default: ($$anchor, $$slotProps) => {
				const data = $.derived_safe_equal(() => $$slotProps.data);
				const thing = $.derived_safe_equal(() => $.get(data));

				$.next();

				var text = $.text();

				$.template_effect(() => $.set_text(text, $.get(thing)));
				$.append($$anchor, text);
			}
		}
	});
}