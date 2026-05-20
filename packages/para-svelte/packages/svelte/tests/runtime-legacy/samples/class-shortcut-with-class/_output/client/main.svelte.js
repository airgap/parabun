import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<div></div>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let myClass = $.prop($$props, 'myClass', 12);
	let foo = $.prop($$props, 'foo', 12);
	let bar = $.prop($$props, 'bar', 12);
	let unused = $.prop($$props, 'unused', 12);

	var $$exports = {
		get myClass() {
			return myClass();
		},

		set myClass($$value) {
			myClass($$value);
			$.flush();
		},

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

		get unused() {
			return unused();
		},

		set unused($$value) {
			unused($$value);
			$.flush();
		}
	};

	var div = root();
	let classes;

	$.template_effect(() => classes = $.set_class(div, 1, $.clsx(myClass()), null, classes, { foo: foo(), bar: bar(), unused: unused() }));
	$.append($$anchor, div);

	return $.pop($$exports);
}