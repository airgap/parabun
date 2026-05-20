import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<p> </p>`);
var root_2 = $.from_html(`<p> </p>`);
var root = $.from_html(`before <!> after`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let animals = $.prop($$props, 'animals', 12);
	let foo = $.prop($$props, 'foo', 12);

	var $$exports = {
		get animals() {
			return animals();
		},

		set animals($$value) {
			animals($$value);
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

	$.next();

	var fragment = root();
	var node = $.sibling($.first_child(fragment));

	$.each(
		node,
		1,
		animals,
		(animal) => animal,
		($$anchor, animal) => {
			var p = root_1();
			var text = $.child(p, true);

			$.reset(p);
			$.template_effect(() => $.set_text(text, $.get(animal)));
			$.append($$anchor, p);
		},
		($$anchor) => {
			var p_1 = root_2();
			var text_1 = $.child(p_1);

			$.reset(p_1);
			$.template_effect(() => $.set_text(text_1, `no animals, but rather ${foo() ?? ''}`));
			$.append($$anchor, p_1);
		}
	);

	$.next();
	$.append($$anchor, fragment);

	return $.pop($$exports);
}