import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import B from './B.svelte';

var root_1 = $.from_html(`<span> </span> <!>`, 1);

export default function A($$anchor, $$props) {
	$.push($$props, false);

	let x = $.prop($$props, 'x', 12);

	var $$exports = {
		get x() {
			return x();
		},

		set x($$value) {
			x($$value);
			$.flush();
		}
	};

	B($$anchor, {
		get x() {
			return x();
		},
		children: $.invalid_default_snippet,
		$$slots: {
			default: ($$anchor, $$slotProps) => {
				const reflected = $.derived_safe_equal(() => $$slotProps.reflected);
				var fragment_1 = root_1();
				var span = $.first_child(fragment_1);
				var text = $.child(span, true);

				$.reset(span);

				var node = $.sibling(span, 2);

				$.slot(
					node,
					$$props,
					'default',
					{
						get reflected() {
							return $.get(reflected);
						}
					},
					null
				);

				$.template_effect(() => $.set_text(text, $.get(reflected)));
				$.append($$anchor, fragment_1);
			}
		}
	});

	return $.pop($$exports);
}