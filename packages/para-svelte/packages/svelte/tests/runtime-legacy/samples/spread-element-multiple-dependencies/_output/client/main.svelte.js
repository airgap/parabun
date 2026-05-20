import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<div></div>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let foo = $.prop($$props, 'foo', 12, false);
	let a = $.prop($$props, 'a', 12, 'a');
	let b = $.prop($$props, 'b', 12, 'b');
	let bar = $.prop($$props, 'bar', 28, () => ({ title: 'baz' }));

	var $$exports = {
		get foo() {
			return foo();
		},

		set foo($$value) {
			foo($$value);
			$.flush();
		},

		get a() {
			return a();
		},

		set a($$value) {
			a($$value);
			$.flush();
		},

		get b() {
			return b();
		},

		set b($$value) {
			b($$value);
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

	var div = root();

	$.attribute_effect(div, () => ({ class: foo() ? a() : b(), ...bar() }));
	$.append($$anchor, div);

	return $.pop($$exports);
}