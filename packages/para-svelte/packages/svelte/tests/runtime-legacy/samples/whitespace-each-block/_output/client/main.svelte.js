import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<span> </span>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let characters = $.prop($$props, 'characters', 12);

	var $$exports = {
		get characters() {
			return characters();
		},

		set characters($$value) {
			characters($$value);
			$.flush();
		}
	};

	var fragment = $.comment();
	var node = $.first_child(fragment);

	$.each(node, 1, characters, $.index, ($$anchor, char) => {
		var span = root_1();
		var text = $.child(span, true);

		$.reset(span);
		$.template_effect(() => $.set_text(text, $.get(char)));
		$.append($$anchor, span);
	});

	$.append($$anchor, fragment);

	return $.pop($$exports);
}