import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<div></div> <div>some div <button>click</button></div>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let inert = $.prop($$props, 'inert', 12);

	var $$exports = {
		get inert() {
			return inert();
		},

		set inert($$value) {
			inert($$value);
			$.flush();
		}
	};

	var fragment = root();
	var div = $.first_child(fragment);

	div.inert = false;

	var div_1 = $.sibling(div, 2);

	$.template_effect(() => div_1.inert = inert());
	$.append($$anchor, fragment);

	return $.pop($$exports);
}