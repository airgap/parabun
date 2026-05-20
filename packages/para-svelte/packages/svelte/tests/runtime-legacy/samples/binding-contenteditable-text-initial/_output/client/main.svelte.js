import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<editor contenteditable="true"><b>world</b></editor> <p> </p>`, 1);

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

	var fragment = root();
	var editor = $.first_child(fragment);
	var p = $.sibling(editor, 2);
	var text = $.child(p);

	$.reset(p);
	$.template_effect(() => $.set_text(text, `hello ${name() ?? ''}`));
	$.bind_content_editable('textContent', editor, name);
	$.append($$anchor, fragment);

	return $.pop($$exports);
}