import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let foo = $.prop($$props, 'foo', 28, () => ({}));
	let bar = $.prop($$props, 'bar', 12);

	$.legacy_pre_effect(() => ($.deep_read_state(bar())), () => {
		if (bar()) {
			foo(foo()[bar()] = true, true);
		}
	});

	$.legacy_pre_effect_reset();

	var $$exports = {
		get foo() {
			return foo();
		},

		set foo($$value) {
			foo($$value);
			$.flush();
		},

		get bar() {
			return bar();
		},

		set bar($$value) {
			bar($$value);
			$.flush();
		}
	};

	$.init();

	return $.pop($$exports);
}