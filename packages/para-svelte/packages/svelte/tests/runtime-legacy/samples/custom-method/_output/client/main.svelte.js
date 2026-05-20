import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<button>+1</button> <p> </p>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let counter = $.prop($$props, 'counter', 12, 0);

	function add1() {
		counter(counter() + 1);
	}

	function foo() {
		return 42;
	}

	var $$exports = {
		foo,
		get counter() {
			return counter();
		},

		set counter($$value) {
			counter($$value);
			$.flush();
		}
	};

	var fragment = root();
	var button = $.first_child(fragment);
	var p = $.sibling(button, 2);
	var text = $.child(p, true);

	$.reset(p);
	$.template_effect(() => $.set_text(text, counter()));
	$.event('click', button, add1);
	$.append($$anchor, fragment);
	$.bind_prop($$props, 'foo', foo);

	return $.pop($$exports);
}