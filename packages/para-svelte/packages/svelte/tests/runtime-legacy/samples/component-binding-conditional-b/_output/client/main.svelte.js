import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Foo from './Foo.svelte';
import Bar from './Bar.svelte';
import Baz from './Baz.svelte';

var root = $.from_html(`<p> </p> <!> <!>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let y = $.prop($$props, 'y', 12);
	let x = $.prop($$props, 'x', 12);

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

	var fragment = root();
	var p = $.first_child(fragment);
	var text = $.child(p);

	$.reset(p);

	var node = $.sibling(p, 2);

	Baz(node, {
		get x() {
			return x();
		},

		set x($$value) {
			x($$value);
		},
		$$legacy: true
	});

	var node_1 = $.sibling(node, 2);

	{
		var consequent = ($$anchor) => {
			Foo($$anchor, {
				get y() {
					return y();
				},

				set y($$value) {
					y($$value);
				},
				$$legacy: true
			});
		};

		var alternate = ($$anchor) => {
			Bar($$anchor, {
				get y() {
					return y();
				},

				set y($$value) {
					y($$value);
				},
				$$legacy: true
			});
		};

		$.if(node_1, ($$render) => {
			if (x()) $$render(consequent); else $$render(alternate, -1);
		});
	}

	$.template_effect(() => $.set_text(text, `y: ${y() ?? ''}`));
	$.append($$anchor, fragment);

	return $.pop($$exports);
}