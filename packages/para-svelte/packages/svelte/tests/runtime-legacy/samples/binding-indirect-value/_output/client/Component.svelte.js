import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(` <br/>`, 1);

export default function Component($$anchor, $$props) {
	$.push($$props, false);

	let value = $.prop($$props, 'value', 12);

	value("bar");

	var $$exports = {
		get value() {
			return value();
		},

		set value($$value) {
			value($$value);
			$.flush();
		}
	};

	$.next();

	var fragment = root();
	var text = $.first_child(fragment);

	$.next();
	$.template_effect(() => $.set_text(text, `Child component "${value() ?? ''}"`));
	$.append($$anchor, fragment);

	return $.pop($$exports);
}