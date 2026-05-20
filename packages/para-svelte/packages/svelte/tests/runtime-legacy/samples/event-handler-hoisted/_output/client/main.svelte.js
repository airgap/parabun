import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<button>click me</button>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let snapshot = $.prop($$props, 'snapshot', 12);
	let foo = $.prop($$props, 'foo', 12);
	let a = $.prop($$props, 'a', 12);

	function baz(a) {
		snapshot(a);
	}

	var $$exports = {
		baz,
		get snapshot() {
			return snapshot();
		},

		set snapshot($$value) {
			snapshot($$value);
			$.flush();
		},

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
		}
	};

	var fragment = $.comment();
	var node = $.first_child(fragment);

	$.each(node, 1, foo, $.index, ($$anchor, bar) => {
		var button = root_1();

		$.event('click', button, () => baz(a()));
		$.append($$anchor, button);
	});

	$.append($$anchor, fragment);
	$.bind_prop($$props, 'baz', baz);

	return $.pop($$exports);
}