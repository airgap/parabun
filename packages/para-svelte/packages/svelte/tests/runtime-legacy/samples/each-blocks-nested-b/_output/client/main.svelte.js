import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_2 = $.from_html(`<p> </p>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let categories = $.prop($$props, 'categories', 12);

	var $$exports = {
		get categories() {
			return categories();
		},

		set categories($$value) {
			categories($$value);
			$.flush();
		}
	};

	var fragment = $.comment();
	var node = $.first_child(fragment);

	$.each(node, 1, categories, $.index, ($$anchor, category) => {
		var fragment_1 = $.comment();
		var node_1 = $.first_child(fragment_1);

		$.each(node_1, 1, () => ($.get(category), $.untrack(() => $.get(category).things)), $.index, ($$anchor, thing) => {
			var p = root_2();
			var text = $.child(p);

			$.reset(p);
			$.template_effect(() => $.set_text(text, `${($.get(category), $.untrack(() => $.get(category).name)) ?? ''}: ${($.get(thing), $.untrack(() => $.get(thing).name)) ?? ''}`));
			$.append($$anchor, p);
		});

		$.append($$anchor, fragment_1);
	});

	$.append($$anchor, fragment);

	return $.pop($$exports);
}