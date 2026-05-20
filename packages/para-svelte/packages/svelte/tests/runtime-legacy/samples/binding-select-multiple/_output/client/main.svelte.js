import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<select multiple=""><option>one</option><option>two</option><option>three</option></select> <p> </p>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let selected = $.prop($$props, 'selected', 12);

	var $$exports = {
		get selected() {
			return selected();
		},

		set selected($$value) {
			selected($$value);
			$.flush();
		}
	};

	$.init();

	var fragment = root();
	var select = $.first_child(fragment);
	var p = $.sibling(select, 2);
	var text = $.child(p);

	$.reset(p);

	$.template_effect(($0) => $.set_text(text, `selected: ${$0 ?? ''}`), [
		() => (
			$.deep_read_state(selected()),
			$.untrack(() => selected().join(', '))
		)
	]);

	$.bind_select_value(select, selected);
	$.append($$anchor, fragment);

	return $.pop($$exports);
}