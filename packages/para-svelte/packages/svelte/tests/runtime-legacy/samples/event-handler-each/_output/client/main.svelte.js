import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<button> </button>`);
var root = $.from_html(`<!> <p> </p>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let items = $.prop($$props, 'items', 12);
	let selected = $.prop($$props, 'selected', 12);

	var $$exports = {
		get items() {
			return items();
		},

		set items($$value) {
			items($$value);
			$.flush();
		},

		get selected() {
			return selected();
		},

		set selected($$value) {
			selected($$value);
			$.flush();
		}
	};

	var fragment = root();
	var node = $.first_child(fragment);

	$.each(node, 1, items, $.index, ($$anchor, item) => {
		var button = root_1();
		var text = $.child(button, true);

		$.reset(button);
		$.template_effect(() => $.set_text(text, $.get(item)));
		$.event('click', button, () => selected($.get(item)));
		$.append($$anchor, button);
	});

	var p = $.sibling(node, 2);
	var text_1 = $.child(p);

	$.reset(p);
	$.template_effect(() => $.set_text(text_1, `selected: ${selected() ?? ''}`));
	$.append($$anchor, fragment);

	return $.pop($$exports);
}