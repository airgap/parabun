import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<p> </p>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let animalEntries = $.prop($$props, 'animalEntries', 12);

	var $$exports = {
		get animalEntries() {
			return animalEntries();
		},

		set animalEntries($$value) {
			animalEntries($$value);
			$.flush();
		}
	};

	var fragment = $.comment();
	var node = $.first_child(fragment);

	$.each(node, 1, animalEntries, $.index, ($$anchor, $$item) => {
		let animal = () => $.get($$item).animal;
		let props = () => $.exclude_from_object($.get($$item), ['animal']);
		var p = root_1();

		$.attribute_effect(p, () => ({ ...props() }));

		var text = $.child(p, true);

		$.reset(p);
		$.template_effect(() => $.set_text(text, animal()));
		$.append($$anchor, p);
	});

	$.append($$anchor, fragment);

	return $.pop($$exports);
}