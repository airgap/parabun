import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<div> </div>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let deferred = $.prop($$props, 'deferred', 12);
	let text = $.mutable_source('same');

	setTimeout(
		() => {
			$.set(text, 'same text');
			deferred().resolve();
		},
		5
	);

	var $$exports = {
		get deferred() {
			return deferred();
		},

		set deferred($$value) {
			deferred($$value);
			$.flush();
		}
	};

	$.init();

	var div = root();
	var text_1 = $.child(div);

	$.reset(div);
	$.template_effect(() => $.set_text(text_1, `${$.get(text) ?? ''} text`));
	$.append($$anchor, div);

	return $.pop($$exports);
}