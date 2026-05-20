import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<p> </p>`);

export default function Widget($$anchor, $$props) {
	$.push($$props, false);

	let index = $.prop($$props, 'index', 12);
	let widget = $.prop($$props, 'widget', 12);

	var $$exports = {
		get index() {
			return index();
		},

		set index($$value) {
			index($$value);
			$.flush();
		},

		get widget() {
			return widget();
		},

		set widget($$value) {
			widget($$value);
			$.flush();
		}
	};

	$.init();

	var p = root();
	var text = $.child(p);

	$.reset(p);
	$.template_effect(() => $.set_text(text, `${index() + 1}: ${($.deep_read_state(widget()), $.untrack(() => widget().name)) ?? ''}`));
	$.append($$anchor, p);

	return $.pop($$exports);
}