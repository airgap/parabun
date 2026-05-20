import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';
import { get, set } from "./test.svelte.js";

var root = $.from_html(` <p> </p> <button></button>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let x = $.prop($$props, 'x', 12, 42);

	var $$exports = {
		get x() {
			return x();
		},

		set x($$value) {
			x($$value);
			$.flush();
		}
	};

	$.init();
	$.next();

	var fragment = root();
	var text = $.first_child(fragment);
	var p = $.sibling(text);
	var text_1 = $.child(p, true);

	$.reset(p);

	var button = $.sibling(p, 2);

	$.template_effect(
		($0) => {
			$.set_text(text, `${x() ?? ''} `);
			$.set_text(text_1, $0);
		},
		[() => ($.deep_read_state(get), $.untrack(get))]
	);

	$.delegated('click', button, () => set());
	$.append($$anchor, fragment);

	return $.pop($$exports);
}

$.delegate(['click']);