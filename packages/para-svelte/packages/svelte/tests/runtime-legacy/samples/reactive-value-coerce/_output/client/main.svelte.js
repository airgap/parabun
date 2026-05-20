import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let a = $.prop($$props, 'a', 28, () => ({ b: [1] }));
	const identity = (x) => x;

	var $$exports = {
		get a() {
			return a();
		},

		set a($$value) {
			a($$value);
			$.flush();
		}
	};

	$.init();
	$.next();

	var text = $.text();

	$.template_effect(($0) => $.set_text(text, `${($.deep_read_state(a()), $.untrack(() => a().b)) ?? ''}-${$0 ?? ''}`), [
		() => ($.deep_read_state(a()), $.untrack(() => identity(a().b)))
	]);

	$.append($$anchor, text);

	return $.pop($$exports);
}