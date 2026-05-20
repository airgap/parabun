import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<p> </p>`);
var root_2 = $.from_html(`<p> </p>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let fn = $.prop($$props, 'fn', 12);
	let other_fn = $.prop($$props, 'other_fn', 12);
	let foo = $.prop($$props, 'foo', 12);

	var $$exports = {
		get fn() {
			return fn();
		},

		set fn($$value) {
			fn($$value);
			$.flush();
		},

		get other_fn() {
			return other_fn();
		},

		set other_fn($$value) {
			other_fn($$value);
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

		var d = $.derived(() => (
			$.deep_read_state(fn()),
			$.deep_read_state(foo()),
			$.untrack(() => fn()(foo()))
		));

		var consequent_1 = ($$anchor) => {
			var p_1 = root_2();
			var text_1 = $.child(p_1, true);

			$.reset(p_1);

			$.template_effect(($0) => $.set_text(text_1, $0), [
				() => (
					$.deep_read_state(foo()),
					$.untrack(() => foo().toUpperCase())
				)
			]);

			$.append($$anchor, p_1);
		};

		var d_1 = $.derived(() => ($.deep_read_state(other_fn()), $.untrack(() => other_fn()())));

		$.if(node, ($$render) => {
			if ($.get(d)) $$render(consequent); else if ($.get(d_1)) $$render(consequent_1, 1);
		});
	}

	$.append($$anchor, fragment);

	return $.pop($$exports);
}