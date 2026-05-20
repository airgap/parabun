import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<h1>Hello <strong> </strong> <span>How are you?</span></h1>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let name = $.prop($$props, 'name', 12);

	var $$exports = {
		get name() {
			return name();
		},

		set name($$value) {
			name($$value);
			$.flush();
		}
	};

	var h1 = root();
	var strong = $.sibling($.child(h1));
	var text = $.child(strong);

	$.reset(strong);
	$.next(2);
	$.reset(h1);
	$.template_effect(() => $.set_text(text, `${name() ?? ''}!`));
	$.append($$anchor, h1);

	return $.pop($$exports);
}