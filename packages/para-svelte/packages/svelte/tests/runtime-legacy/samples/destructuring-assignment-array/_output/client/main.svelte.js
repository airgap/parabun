import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<li> </li>`);
var root = $.from_html(`<ul></ul>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let cheese = $.mutable_source(['Gruyere', 'Compté', 'Beaufort', 'Abondance']);

	function swap(a, b) {
		(($$value) => {
			var $$array = $.to_array($$value, 2);

			$.mutate(cheese, $.get(cheese)[a] = $$array[0]);
			$.mutate(cheese, $.get(cheese)[b] = $$array[1]);
		})([$.get(cheese)[b], $.get(cheese)[a]]);
	}

	var $$exports = { swap };
	var ul = root();

	$.each(ul, 5, () => $.get(cheese), $.index, ($$anchor, cheese, $$index, $$array_1) => {
		var li = root_1();
		var text = $.child(li, true);

		$.reset(li);
		$.template_effect(() => $.set_text(text, $.get(cheese)));
		$.append($$anchor, li);
	});

	$.reset(ul);
	$.append($$anchor, ul);
	$.bind_prop($$props, 'swap', swap);

	return $.pop($$exports);
}