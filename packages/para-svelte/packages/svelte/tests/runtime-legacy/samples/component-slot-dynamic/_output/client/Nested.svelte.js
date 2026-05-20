import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<span> </span>`);

export default function Nested($$anchor, $$props) {
	$.push($$props, false);

	let foo = $.prop($$props, 'foo', 12, 'a');

	var $$exports = {
		get foo() {
			return foo();
		},

		set foo($$value) {
			foo($$value);
			$.flush();
		}
	};

	var fragment = $.comment();
	var node = $.first_child(fragment);

	$.slot(node, $$props, 'default', {}, ($$anchor) => {
		var span = root_1();
		var text = $.child(span, true);

		$.reset(span);
		$.template_effect(() => $.set_text(text, foo()));
		$.append($$anchor, span);
	});

	$.append($$anchor, fragment);

	return $.pop($$exports);
}