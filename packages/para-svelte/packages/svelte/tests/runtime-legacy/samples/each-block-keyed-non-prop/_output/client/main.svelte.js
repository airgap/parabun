import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<p> </p>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let words = $.prop($$props, 'words', 12);

	var $$exports = {
		get words() {
			return words();
		},

		set words($$value) {
			words($$value);
			$.flush();
		}
	};

	var fragment = $.comment();
	var node = $.first_child(fragment);

	$.each(node, 1, words, (word) => word, ($$anchor, word) => {
		var p = root_1();
		var text = $.child(p, true);

		$.reset(p);
		$.template_effect(() => $.set_text(text, $.get(word)));
		$.append($$anchor, p);
	});

	$.append($$anchor, fragment);

	return $.pop($$exports);
}