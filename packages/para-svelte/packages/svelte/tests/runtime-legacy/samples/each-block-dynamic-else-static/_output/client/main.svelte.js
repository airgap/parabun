import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<p> </p>`);
var root_2 = $.from_html(`<p>no animals</p>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let animals = $.prop($$props, 'animals', 12);

	var $$exports = {
		get animals() {
			return animals();
		},

		set animals($$value) {
			animals($$value);
			$.flush();
		}
	};

	var fragment = $.comment();
	var node = $.first_child(fragment);

	$.each(
		node,
		1,
		animals,
		$.index,
		($$anchor, animal) => {
			var p = root_1();
			var text = $.child(p, true);

			$.reset(p);
			$.template_effect(() => $.set_text(text, $.get(animal)));
			$.append($$anchor, p);
		},
		($$anchor) => {
			var p_1 = root_2();

			$.append($$anchor, p_1);
		}
	);

	$.append($$anchor, fragment);

	return $.pop($$exports);
}