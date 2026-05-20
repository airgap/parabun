import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

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

	$.each(node, 1, animals, $.index, ($$anchor, animal) => {
		$.next();

		var text = $.text();

		$.template_effect(() => $.set_text(text, `(${$.get(animal) ?? ''})`));
		$.append($$anchor, text);
	});

	$.append($$anchor, fragment);

	return $.pop($$exports);
}