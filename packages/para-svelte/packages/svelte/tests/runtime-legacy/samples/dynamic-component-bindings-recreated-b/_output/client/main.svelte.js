import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Green from './Green.svelte';
import Red from './Red.svelte';

var root = $.from_html(`<p> </p> <!>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let foo = $.prop($$props, 'foo', 12);
	let x = $.prop($$props, 'x', 12);

	var $$exports = {
		get foo() {
			return foo();
		},

		set foo($$value) {
			foo($$value);
			$.flush();
		},

		get x() {
			return x();
		},

		set x($$value) {
			x($$value);
			$.flush();
		}
	};

	var fragment = root();
	var p = $.first_child(fragment);
	var text = $.child(p);

	$.reset(p);

	var node = $.sibling(p, 2);

	$.component(node, () => x() ? Green : Red, ($$anchor, $$component) => {
		$$component($$anchor, {
			get foo() {
				return foo();
			},

			set foo($$value) {
				foo($$value);
			},
			$$legacy: true
		});
	});

	$.template_effect(() => $.set_text(text, `parent ${foo() ?? ''}`));
	$.append($$anchor, fragment);

	return $.pop($$exports);
}