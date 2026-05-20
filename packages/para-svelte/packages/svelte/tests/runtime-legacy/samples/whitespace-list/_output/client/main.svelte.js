import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<ul><li> </li> <li> </li> <li> </li></ul>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let one = $.prop($$props, 'one', 12);
	let two = $.prop($$props, 'two', 12);
	let three = $.prop($$props, 'three', 12);

	var $$exports = {
		get one() {
			return one();
		},

		set one($$value) {
			one($$value);
			$.flush();
		},

		get two() {
			return two();
		},

		set two($$value) {
			two($$value);
			$.flush();
		},

		get three() {
			return three();
		},

		set three($$value) {
			three($$value);
			$.flush();
		}
	};

	var ul = root();
	var li = $.child(ul);
	var text = $.child(li, true);

	$.reset(li);

	var li_1 = $.sibling(li, 2);
	var text_1 = $.child(li_1, true);

	$.reset(li_1);

	var li_2 = $.sibling(li_1, 2);
	var text_2 = $.child(li_2, true);

	$.reset(li_2);
	$.reset(ul);

	$.template_effect(() => {
		$.set_text(text, one());
		$.set_text(text_1, two());
		$.set_text(text_2, three());
	});

	$.append($$anchor, ul);

	return $.pop($$exports);
}