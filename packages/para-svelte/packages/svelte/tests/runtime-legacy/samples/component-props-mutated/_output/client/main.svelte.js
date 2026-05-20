import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<p> </p>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let data = $.prop($$props, 'data', 12);

	var $$exports = {
		get data() {
			return data();
		},

		set data($$value) {
			data($$value);
			$.flush();
		}
	};

	$.init();

	var p = root();
	var text = $.child(p, true);

	$.reset(p);
	$.template_effect(() => $.set_text(text, ($.deep_read_state(data()), $.untrack(() => data().message))));
	$.append($$anchor, p);

	return $.pop($$exports);
}