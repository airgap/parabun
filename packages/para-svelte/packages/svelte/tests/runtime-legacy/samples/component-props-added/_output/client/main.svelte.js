import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<p> </p>`);

export default function Main($$anchor, $$props) {
	const $$sanitized_props = $.legacy_rest_props($$props, ['children', '$$slots', '$$events', '$$legacy']);

	$.push($$props, false);
	$.init();

	var fragment = $.comment();
	var node = $.first_child(fragment);

	{
		var consequent = ($$anchor) => {
			var p = root_1();
			var text = $.child(p, true);

			$.reset(p);

			$.template_effect(() => $.set_text(text, (
				$.deep_read_state($$sanitized_props),
				$.untrack(() => $$sanitized_props.message)
			)));

			$.append($$anchor, p);
		};

		$.if(node, ($$render) => {
			if ('message' in $$sanitized_props) $$render(consequent);
		});
	}

	$.append($$anchor, fragment);
	$.pop();
}