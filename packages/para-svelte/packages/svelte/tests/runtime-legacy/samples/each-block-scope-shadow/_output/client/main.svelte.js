import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<!> `, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let animal = $.prop($$props, 'animal', 12, 'lemur');
	let animals = $.prop($$props, 'animals', 28, () => ['alpaca', 'baboon', 'capybara']);

	var $$exports = {
		get animal() {
			return animal();
		},

		set animal($$value) {
			animal($$value);
			$.flush();
		},

		get animals() {
			return animals();
		},

		set animals($$value) {
			animals($$value);
			$.flush();
		}
	};

	var fragment = root();
	var node = $.first_child(fragment);

	$.each(node, 1, animals, $.index, ($$anchor, animal, $$index, $$array) => {
		$.next();

		var text = $.text();

		$.template_effect(() => $.set_text(text, `(${$.get(animal) ?? ''})`));
		$.append($$anchor, text);
	});

	var text_1 = $.sibling(node);

	$.template_effect(() => $.set_text(text_1, ` (${animal() ?? ''})`));
	$.append($$anchor, fragment);

	return $.pop($$exports);
}