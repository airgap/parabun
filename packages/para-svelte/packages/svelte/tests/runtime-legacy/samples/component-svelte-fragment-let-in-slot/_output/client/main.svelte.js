import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Outer from './Outer.svelte';
import Inner from './Inner.svelte';

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let prop = $.prop($$props, 'prop', 12);

	var $$exports = {
		get prop() {
			return prop();
		},

		set prop($$value) {
			prop($$value);
			$.flush();
		}
	};

	Outer($$anchor, {
		get prop() {
			return prop();
		},

		$$slots: {
			main: ($$anchor, $$slotProps) => {
				const value = $.derived_safe_equal(() => $$slotProps.value);

				Inner($$anchor, {
					$$slots: {
						main: ($$anchor, $$slotProps) => {
							var text = $.text();

							$.template_effect(() => $.set_text(text, $.get(value)));
							$.append($$anchor, text);
						}
					}
				});
			}
		}
	});

	return $.pop($$exports);
}