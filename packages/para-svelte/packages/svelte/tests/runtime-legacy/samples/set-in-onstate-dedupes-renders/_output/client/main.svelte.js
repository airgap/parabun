import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Widget from './Widget.svelte';

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let foo = $.prop($$props, 'foo', 28, () => ({ x: 1 }));
	let bar = $.prop($$props, 'bar', 28, () => ({ x: 1 }));

	$.legacy_pre_effect(() => ($.deep_read_state(foo())), () => {
		bar(foo());
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

	Widget($$anchor, {
		get foo() {
			return foo();
		},

		get bar() {
			return bar();
		}
	});

	return $.pop($$exports);
}