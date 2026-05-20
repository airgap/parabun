import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<button class="baz">baz</button> <p> </p>`, 1);

export default function Baz($$anchor, $$props) {
	$.push($$props, false);

	let x = $.prop($$props, 'x', 12);

	var $$exports = {
		get x() {
			return x();
		},

		set x($$value) {
			x($$value);
			$.flush();
		}
	};

	var fragment = root();
	var button = $.first_child(fragment);
	var p = $.sibling(button, 2);
	var text = $.child(p);

	$.reset(p);
	$.template_effect(() => $.set_text(text, `baz x: ${x() ?? ''}`));
	$.event('click', button, () => x("r"));
	$.append($$anchor, fragment);

	return $.pop($$exports);
}