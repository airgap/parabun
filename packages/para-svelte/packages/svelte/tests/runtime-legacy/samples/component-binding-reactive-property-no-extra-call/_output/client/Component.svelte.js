import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

export default function Component($$anchor, $$props) {
	$.push($$props, false);

	let value = $.prop($$props, 'value', 12);
	let value2 = $.prop($$props, 'value2', 12);

	var $$exports = {
		get value() {
			return value();
		},

		set value($$value) {
			value($$value);
			$.flush();
		},

		get value2() {
			return value2();
		},

		set value2($$value) {
			value2($$value);
			$.flush();
		}
	};

	$.next();

	var text = $.text();

	$.template_effect(() => $.set_text(text, `${value() ?? ''}${value2() ?? ''}`));
	$.append($$anchor, text);

	return $.pop($$exports);
}