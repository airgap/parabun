import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<div><button class="allow-propagation">click me</button></div> <div><button class="stop-propagation">click me</button></div>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let foo = $.prop($$props, 'foo', 12, false);
	let bar = $.prop($$props, 'bar', 12, false);

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

	var fragment = root();
	var div = $.first_child(fragment);
	var div_1 = $.sibling(div, 2);
	var button = $.child(div_1);

	$.reset(div_1);
	$.event('click', div, () => foo(true));
	$.event('click', button, (event) => event.stopPropagation());
	$.event('click', div_1, () => bar(true));
	$.append($$anchor, fragment);

	return $.pop($$exports);
}