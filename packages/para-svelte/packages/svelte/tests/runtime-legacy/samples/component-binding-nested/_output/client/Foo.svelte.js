import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Bar from './Bar.svelte';

var root = $.from_html(`<button class="foo">foo</button> <p> </p> <!>`, 1);

export default function Foo($$anchor, $$props) {
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
	var button = $.first_child(fragment);
	var p = $.sibling(button, 2);
	var text = $.child(p);

	$.reset(p);

	var node = $.sibling(p, 2);

	Bar(node, {
		get x() {
			return x();
		},

		set x($$value) {
			x($$value);
		},
		$$legacy: true
	});

	$.template_effect(() => $.set_text(text, `foo x: ${x() ?? ''}`));
	$.event('click', button, () => x("p"));
	$.append($$anchor, fragment);

	return $.pop($$exports);
}