import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let values = $.prop($$props, 'values', 12);

	var $$exports = {
		get values() {
			return values();
		},

		set values($$value) {
			values($$value);
			$.flush();
		}
	};

	var fragment = $.comment();
	var node = $.first_child(fragment);

	$.each(node, 1, values, (value) => value.id, ($$anchor, value) => {
		$.next();

		var text = $.text();

		$.template_effect(() => $.set_text(text, `(${($.get(value), $.untrack(() => $.get(value).id)) ?? ''})`));
		$.append($$anchor, text);
	});

	$.append($$anchor, fragment);

	return $.pop($$exports);
}