import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<p> </p> <select><option>a</option><option selected="">b</option><option>c</option></select> <p> </p>`, 1);

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

	var fragment = root();
	var p = $.first_child(fragment);
	var text = $.child(p);

	$.reset(p);

	var select = $.sibling(p, 2);
	var p_1 = $.sibling(select, 2);
	var text_1 = $.child(p_1);

	$.reset(p_1);

	$.template_effect(() => {
		$.set_text(text, `selected: ${selected() ?? ''}`);
		$.set_text(text_1, `selected: ${selected() ?? ''}`);
	});

	$.bind_select_value(select, selected);
	$.append($$anchor, fragment);

	return $.pop($$exports);
}