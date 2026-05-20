import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';
import Child from './Child.svelte';

var root_1 = $.from_html(`<p>loading...</p>`);
var root_3 = $.from_html(`<p> </p>`);

export default function Main($$anchor) {
	var fragment = $.comment();
	var node = $.first_child(fragment);

	{
		const pending = ($$anchor) => {
			var p = root_1();

			$.append($$anchor, p);
		};

		$.boundary(node, { pending }, ($$anchor) => {
			Child($$anchor, {
				children: $.invalid_default_snippet,
				$$slots: {
					default: ($$anchor, $$slotProps) => {
						const message = $.derived(() => $$slotProps.message);
						var p_1 = root_3();
						var text = $.child(p_1, true);

						$.reset(p_1);
						$.template_effect(() => $.set_text(text, $.get(message)));
						$.append($$anchor, p_1);
					}
				}
			});
		});
	}

	$.append($$anchor, fragment);
}