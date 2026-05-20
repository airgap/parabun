import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Nested from './Nested.svelte';

var root_1 = $.from_html(`<div> </div>`);

export default function Main($$anchor) {
	Nested($$anchor, {
		children: $.invalid_default_snippet,
		$$slots: {
			default: ($$anchor, $$slotProps) => {
				const item = $.derived_safe_equal(() => $$slotProps.item);
				const value = $.derived_safe_equal(() => $$slotProps.value);
				var div = root_1();
				var text = $.child(div);

				$.reset(div);
				$.template_effect(() => $.set_text(text, `${$.get(item) ?? ''} - ${$.get(value) ?? ''}`));
				$.append($$anchor, div);
			}
		}
	});
}