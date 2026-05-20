import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<button> </button>`);

export default function Card($$anchor, $$props) {
	$.push($$props, false);

	let card = $.prop($$props, 'card', 12);
	let onfav = $.prop($$props, 'onfav', 12);

	var $$exports = {
		get card() {
			return card();
		},

		set card($$value) {
			card($$value);
			$.flush();
		},

		get onfav() {
			return onfav();
		},

		set onfav($$value) {
			onfav($$value);
			$.flush();
		}
	};

	$.init();

	var button = root();
	var text = $.child(button, true);

	$.reset(button);
	$.template_effect(() => $.set_text(text, ($.deep_read_state(card()), $.untrack(() => card().x))));

	$.event('click', button, function (...$$args) {
		onfav()?.apply(this, $$args);
	});

	$.append($$anchor, button);

	return $.pop($$exports);
}