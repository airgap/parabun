import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<p>foo exists</p>`);
var root = $.from_html(`<p> </p> <!>`, 1);

export default function Child($$anchor, $$props) {
	const $$slots = $.sanitize_slots($$props);
	const props = $.rest_props($$props, ['$$slots', '$$events', '$$legacy']);
	var fragment = root();
	var p = $.first_child(fragment);
	var text = $.child(p, true);

	$.reset(p);

	var node = $.sibling(p, 2);

	{
		var consequent = ($$anchor) => {
			var p_1 = root_1();

			$.append($$anchor, p_1);
		};

		$.if(node, ($$render) => {
			if ($$slots.foo) $$render(consequent);
		});
	}

	$.template_effect(($0) => $.set_text(text, $0), [() => Object.keys(props)]);
	$.append($$anchor, fragment);
}