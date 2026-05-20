import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_2 = $.from_html(`<p> </p>`);
var root_4 = $.from_html(`<p> </p>`);
var root = $.from_html(`<h1> </h1> <!> <div></div>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let name = $.prop($$props, 'name', 12, "world");
	let foo = $.prop($$props, 'foo', 12, 'foo');

	var $$exports = {
		get name() {
			return name();
		},

		set name($$value) {
			name($$value);
			$.flush();
		},

		get foo() {
			return foo();
		},

		set foo($$value) {
			foo($$value);
			$.flush();
		}
	};

	var fragment = root();
	var h1 = $.first_child(fragment);
	var text = $.child(h1);

	$.reset(h1);

	var node = $.sibling(h1, 2);

	$.each(
		node,
		0,
		() => [],
		$.index,
		($$anchor, _) => {
			$.next();

			var text_1 = $.text('nope');

			$.append($$anchor, text_1);
		},
		($$anchor) => {
			var p = root_2();
			var text_2 = $.child(p, true);

			$.reset(p);
			$.template_effect(() => $.set_text(text_2, foo()));
			$.append($$anchor, p);
		}
	);

	var div = $.sibling(node, 2);

	$.each(
		div,
		4,
		() => [],
		$.index,
		($$anchor, _) => {
			$.next();

			var text_3 = $.text('nope');

			$.append($$anchor, text_3);
		},
		($$anchor) => {
			var p_1 = root_4();
			var text_4 = $.child(p_1, true);

			$.reset(p_1);
			$.template_effect(() => $.set_text(text_4, foo()));
			$.append($$anchor, p_1);
		}
	);

	$.reset(div);
	$.template_effect(() => $.set_text(text, `Hello, ${name() ?? ''}`));
	$.append($$anchor, fragment);

	return $.pop($$exports);
}