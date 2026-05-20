import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Nested from './Nested.svelte';
import SlotInner from './SlotInner.svelte';

var root_2 = $.from_html(`<div class="inner-slot"> </div>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let things = $.prop($$props, 'things', 12);

	var $$exports = {
		get things() {
			return things();
		},

		set things($$value) {
			things($$value);
			$.flush();
		}
	};

	Nested($$anchor, {
		get things() {
			return things();
		},

		$$slots: {
			foo: ($$anchor, $$slotProps) => {
				const data = $.derived_safe_equal(() => $$slotProps.thing);

				SlotInner($$anchor, {
					slot: 'foo',
					get thing() {
						return $.get(data);
					},
					children: $.invalid_default_snippet,
					$$slots: {
						default: ($$anchor, $$slotProps) => {
							var div = root_2();
							var text = $.child(div, true);

							$.reset(div);
							$.template_effect(() => $.set_text(text, $.get(data)));
							$.append($$anchor, div);
						}
					}
				});
			}
		}
	});

	return $.pop($$exports);
}