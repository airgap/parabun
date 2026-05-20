import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<p> </p>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let fn = $.prop($$props, 'fn', 12);
	let foo = $.prop($$props, 'foo', 12);

	var $$exports = {
		get fn() {
			return fn();
		},

		set fn($$value) {
			fn($$value);
			$.flush();
		},

		get foo() {
			return foo();
		},

		set foo($$value) {
			foo($$value);
			$.flush();
		}
	};

	$.init();

	var fragment = $.comment();
	var node = $.first_child(fragment);

	{
		var consequent = ($$anchor) => {
			var p = root_1();
			var text = $.child(p, true);

			$.reset(p);
			$.template_effect(() => $.set_text(text, foo()));
			$.append($$anchor, p);
		};

		var d = $.derived(() => ($.deep_read_state(fn()), $.untrack(() => fn()())));

		$.if(node, ($$render) => {
			if ($.get(d)) $$render(consequent);
		});
	}

	$.append($$anchor, fragment);

	return $.pop($$exports);
}