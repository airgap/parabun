import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Foo from './Foo.svelte';

var root = $.from_html(`<p> </p> <!>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let x = $.prop($$props, 'x', 12);

	var $$exports = {
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

	Foo(node, {
		get x() {
			return x();
		},

		set x($$value) {
			x($$value);
		},
		$$legacy: true
	});

	$.template_effect(() => $.set_text(text, `x: ${x() ?? ''}`));
	$.append($$anchor, fragment);

	return $.pop($$exports);
}