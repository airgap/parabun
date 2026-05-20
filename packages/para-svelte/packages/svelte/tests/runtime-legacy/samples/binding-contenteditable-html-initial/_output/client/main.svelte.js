import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<editor contenteditable="true"><b>world</b></editor> <p>hello <!></p>`, 1);

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
	var node = $.sibling($.child(p));

	$.html(node, name);
	$.reset(p);
	$.bind_content_editable('innerHTML', editor, name);
	$.append($$anchor, fragment);

	return $.pop($$exports);
}