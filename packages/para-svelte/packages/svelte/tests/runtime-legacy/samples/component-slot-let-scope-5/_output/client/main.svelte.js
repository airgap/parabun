import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Nested from "./Nested.svelte";
import Nested2 from "./Nested2.svelte";

var root_2 = $.from_html(`<div slot="footer"> </div>`);

export default function Main($$anchor) {
	Nested($$anchor, {
		$$slots: {
			inner: ($$anchor, $$slotProps) => {
				const text = $.derived_safe_equal(() => $$slotProps.text);

				Nested2($$anchor, {
					slot: 'inner',
					$$slots: {
						footer: ($$anchor, $$slotProps) => {
							const text2 = $.derived_safe_equal(() => $.get(text));
							var div = root_2();
							var text_1 = $.child(div);

							$.reset(div);
							$.template_effect(() => $.set_text(text_1, `${$.get(text) ?? ''} ${$.get(text2) ?? ''}`));
							$.append($$anchor, div);
						}
					}
				});
			}
		}
	});
}