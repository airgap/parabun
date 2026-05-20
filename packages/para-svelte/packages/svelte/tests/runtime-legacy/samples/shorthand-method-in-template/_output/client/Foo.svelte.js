import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

export default function Foo($$anchor, $$props) {
	$.push($$props, false);

	let bar = $.prop($$props, 'bar', 12);

	var $$exports = {
		get bar() {
			return bar();
		},

		set bar($$value) {
			bar($$value);
			$.flush();
		}
	};

	$.init();
	$.next();

	var text = $.text();

	$.template_effect(($0) => $.set_text(text, $0), [
		() => ($.deep_read_state(bar()), $.untrack(() => bar().answer()))
	]);

	$.append($$anchor, text);

	return $.pop($$exports);
}