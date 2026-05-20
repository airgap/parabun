import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<p> </p>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let animalPawsEntries = $.prop($$props, 'animalPawsEntries', 12);

	var $$exports = {
		get animalPawsEntries() {
			return animalPawsEntries();
		},

		set animalPawsEntries($$value) {
			animalPawsEntries($$value);
			$.flush();
		}
	};

	var fragment = $.comment();
	var node = $.first_child(fragment);

	$.each(node, 1, animalPawsEntries, $.index, ($$anchor, $$item) => {
		var $$array = $.derived(() => $.to_array($.get($$item), 2));
		let animal = () => $.get($$array)[0];
		let pawType = () => $.get($$array)[1];
		var p = root_1();
		var text = $.child(p);

		$.reset(p);
		$.template_effect(() => $.set_text(text, `${animal() ?? ''}: ${pawType() ?? ''}`));
		$.append($$anchor, p);
	});

	$.append($$anchor, fragment);

	return $.pop($$exports);
}