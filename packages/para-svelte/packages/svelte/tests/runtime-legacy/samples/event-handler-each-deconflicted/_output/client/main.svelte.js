import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<button>foo</button>`);
var root_2 = $.from_html(`<button>bar</button>`);
var root = $.from_html(`<!> <!> <p> </p>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let foo = $.prop($$props, 'foo', 12);
	let clicked = $.prop($$props, 'clicked', 12);
	let bar = $.prop($$props, 'bar', 12);

	var $$exports = {
		get foo() {
			return foo();
		},

		set foo($$value) {
			foo($$value);
			$.flush();
		},

		get clicked() {
			return clicked();
		},

		set clicked($$value) {
			clicked($$value);
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
	var node = $.first_child(fragment);

	$.each(node, 1, foo, $.index, ($$anchor, f) => {
		var button = root_1();

		$.event('click', button, () => clicked("foo"));
		$.append($$anchor, button);
	});

	var node_1 = $.sibling(node, 2);

	$.each(node_1, 1, bar, $.index, ($$anchor, b) => {
		var button_1 = root_2();

		$.event('click', button_1, () => clicked("bar"));
		$.append($$anchor, button_1);
	});

	var p = $.sibling(node_1, 2);
	var text = $.child(p);

	$.reset(p);
	$.template_effect(() => $.set_text(text, `clicked: ${clicked() ?? ''}`));
	$.append($$anchor, fragment);

	return $.pop($$exports);
}