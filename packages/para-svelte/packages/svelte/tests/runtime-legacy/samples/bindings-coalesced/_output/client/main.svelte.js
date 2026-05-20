import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Foo from './Foo.svelte';

var root = $.from_html(`<!> <p> </p>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let p = $.prop($$props, 'p', 12);
	let foo = $.prop($$props, 'foo', 12);
	let bar = $.prop($$props, 'bar', 12);
	let baz = $.prop($$props, 'baz', 12);

	var $$exports = {
		get p() {
			return p();
		},

		set p($$value) {
			p($$value);
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

		get baz() {
			return baz();
		},

		set baz($$value) {
			baz($$value);
			$.flush();
		}
	};

	var fragment = root();
	var node = $.first_child(fragment);

	$.bind_this(
		Foo(node, {
			get bar() {
				return bar();
			},

			set bar($$value) {
				bar($$value);
			},

			get baz() {
				return baz();
			},

			set baz($$value) {
				baz($$value);
			},
			$$legacy: true
		}),
		($$value) => foo($$value),
		() => foo()
	);

	var p_1 = $.sibling(node, 2);
	var text = $.child(p_1, true);

	$.reset(p_1);
	$.bind_this(p_1, ($$value) => p($$value), () => p());
	$.template_effect(() => $.set_text(text, bar() + baz()));
	$.append($$anchor, fragment);

	return $.pop($$exports);
}