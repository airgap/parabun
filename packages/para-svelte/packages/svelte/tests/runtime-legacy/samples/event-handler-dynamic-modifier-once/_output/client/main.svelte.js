import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<button> </button>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let f = $.mutable_source();
	let count = $.prop($$props, 'count', 12, 0);

	$.set(f, () => count(count() + 1));

	var $$exports = {
		get count() {
			return count();
		},

		set count($$value) {
			count($$value);
			$.flush();
		}
	};

	var button = root();
	var text = $.child(button, true);

	$.reset(button);
	$.template_effect(() => $.set_text(text, count()));

	$.event('click', button, $.once(function (...$$args) {
		$.get(f)?.apply(this, $$args);
	}));

	$.append($$anchor, button);

	return $.pop($$exports);
}