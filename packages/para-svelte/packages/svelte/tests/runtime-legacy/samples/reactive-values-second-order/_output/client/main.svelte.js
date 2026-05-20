import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let foo = $.prop($$props, 'foo', 12, 1);
	let bar = $.prop($$props, 'bar', 12);
	let baz = $.prop($$props, 'baz', 12);
	let qux = $.prop($$props, 'qux', 12);

	$.legacy_pre_effect(() => ($.deep_read_state(foo())), () => {
		bar(foo());
		baz(foo());
	});

	$.legacy_pre_effect(() => ($.deep_read_state(bar()), $.deep_read_state(baz())), () => {
		qux(bar() + baz());
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
		},

		get baz() {
			return baz();
		},

		set baz($$value) {
			baz($$value);
			$.flush();
		},

		get qux() {
			return qux();
		},

		set qux($$value) {
			qux($$value);
			$.flush();
		}
	};

	return $.pop($$exports);
}