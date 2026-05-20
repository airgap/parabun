import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

export default function Nested($$anchor, $$props) {
	$.push($$props, false);

	let text = $.mutable_source('Hello World');

	function updateText() {
		$.set(text, 'Bye World');
	}

	var $$exports = { updateText };

	$.next();

	var text_1 = $.text();

	$.template_effect(() => $.set_text(text_1, $.get(text)));
	$.append($$anchor, text_1);
	$.bind_prop($$props, 'updateText', updateText);

	return $.pop($$exports);
}