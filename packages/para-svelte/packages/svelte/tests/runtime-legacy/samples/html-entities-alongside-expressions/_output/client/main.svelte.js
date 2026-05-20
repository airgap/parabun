import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<div> </div>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let str = $.prop($$props, 'str', 12, '>');

	var $$exports = {
		get str() {
			return str();
		},

		set str($$value) {
			str($$value);
			$.flush();
		}
	};

	var div = root();
	var text = $.child(div);

	$.reset(div);
	$.template_effect(() => $.set_text(text, `<p> & ${str() ?? ''} </p>`));
	$.append($$anchor, div);

	return $.pop($$exports);
}