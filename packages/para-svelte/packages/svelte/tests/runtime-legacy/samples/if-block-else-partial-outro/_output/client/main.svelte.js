import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Foo from './Foo.svelte';

var root_2 = $.from_html(`<span> </span>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let y = $.prop($$props, 'y', 12, false);
	let x = $.prop($$props, 'x', 12, 'x');

	var $$exports = {
		get y() {
			return y();
		},

		set y($$value) {
			y($$value);
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

	var fragment = $.comment();
	var node = $.first_child(fragment);

	{
		var consequent = ($$anchor) => {
			Foo($$anchor, {});
		};

		var alternate = ($$anchor) => {
			var span = root_2();
			var text = $.child(span, true);

			$.reset(span);
			$.template_effect(() => $.set_text(text, x()));
			$.append($$anchor, span);
		};

		$.if(node, ($$render) => {
			if (y()) $$render(consequent); else $$render(alternate, -1);
		});
	}

	$.append($$anchor, fragment);

	return $.pop($$exports);
}