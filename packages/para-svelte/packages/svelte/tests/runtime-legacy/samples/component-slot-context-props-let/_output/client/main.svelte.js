import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Nested from './Nested.svelte';

var root_1 = $.from_html(`<button type="button"> </button>`);

export default function Main($$anchor) {
	Nested($$anchor, {
		children: $.invalid_default_snippet,
		$$slots: {
			default: ($$anchor, $$slotProps) => {
				const set = $.derived_safe_equal(() => $$slotProps.set);
				const key = $.derived_safe_equal(() => $$slotProps.key);
				var button = root_1();
				var text = $.child(button);

				$.reset(button);
				$.template_effect(() => $.set_text(text, `Set ${$.get(key) ?? ''}`));
				$.event('click', button, () => $.get(set)(`value-${$.get(key)}`));
				$.append($$anchor, button);
			}
		}
	});
}