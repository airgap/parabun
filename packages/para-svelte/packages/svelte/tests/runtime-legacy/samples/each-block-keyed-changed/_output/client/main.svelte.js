import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<p> </p>`);
var root = $.from_html(`<div class="container"></div>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let titles = $.prop($$props, 'titles', 12);

	var $$exports = {
		get titles() {
			return titles();
		},

		set titles($$value) {
			titles($$value);
			$.flush();
		}
	};

	var div = root();

	$.each(div, 5, titles, (title) => title.name, ($$anchor, title) => {
		var p = root_1();
		var text = $.child(p, true);

		$.reset(p);
		$.template_effect(() => $.set_text(text, ($.get(title), $.untrack(() => $.get(title).name))));
		$.append($$anchor, p);
	});

	$.reset(div);
	$.append($$anchor, div);

	return $.pop($$exports);
}