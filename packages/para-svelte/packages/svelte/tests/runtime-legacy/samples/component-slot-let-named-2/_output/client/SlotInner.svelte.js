import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<span> </span> <!>`, 1);

export default function SlotInner($$anchor, $$props) {
	$.push($$props, false);

	let thing = $.prop($$props, 'thing', 12);

	var $$exports = {
		get thing() {
			return thing();
		},

		set thing($$value) {
			thing($$value);
			$.flush();
		}
	};

	var fragment = root();
	var span = $.first_child(fragment);
	var text = $.child(span, true);

	$.reset(span);

	var node = $.sibling(span, 2);

	$.slot(node, $$props, 'default', {}, null);
	$.template_effect(() => $.set_text(text, thing()));
	$.append($$anchor, fragment);

	return $.pop($$exports);
}