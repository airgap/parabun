import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

export default function Child($$anchor, $$props) {
	$.push($$props, false);

	let x = $.prop($$props, 'x', 12);

	var $$exports = {
		get x() {
			return x();
		},

		set x($$value) {
			x($$value);
			$.flush();
		}
	};

	$.init();
	$.next();

	var text = $.text();

	$.template_effect(() => $.set_text(text, `child: ${($.deep_read_state(x()), $.untrack(() => x().y)) ?? ''}`));
	$.append($$anchor, text);

	return $.pop($$exports);
}