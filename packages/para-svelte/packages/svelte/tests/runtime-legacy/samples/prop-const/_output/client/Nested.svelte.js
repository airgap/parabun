import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<p> </p> <p></p>`, 1);

export default function Nested($$anchor, $$props) {
	$.push($$props, false);

	let a = $.prop($$props, 'a', 12);
	const b = 2;

	var $$exports = {
		b,
		get a() {
			return a();
		},

		set a($$value) {
			a($$value);
			$.flush();
		}
	};

	var fragment = root();
	var p = $.first_child(fragment);
	var text = $.child(p);

	$.reset(p);

	var p_1 = $.sibling(p, 2);

	p_1.textContent = 'b: 2';
	$.template_effect(() => $.set_text(text, `a: ${a() ?? ''}`));
	$.append($$anchor, fragment);
	$.bind_prop($$props, 'b', b);

	return $.pop($$exports);
}