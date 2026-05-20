import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_2 = $.from_html(`<div></div>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let x = $.prop($$props, 'x', 12);
	let things = $.prop($$props, 'things', 12);

	function foo(node, params) {
		return {
			duration: 100,
			tick: (t) => {
				node.foo = t;
			}
		};
	}

	var $$exports = {
		get x() {
			return x();
		},

		set x($$value) {
			x($$value);
			$.flush();
		},

		get things() {
			return things();
		},

		set things($$value) {
			things($$value);
			$.flush();
		}
	};

	var fragment = $.comment();
	var node_1 = $.first_child(fragment);

	{
		var consequent = ($$anchor) => {
			var fragment_1 = $.comment();
			var node_2 = $.first_child(fragment_1);

			$.each(node_2, 1, things, (thing) => thing, ($$anchor, thing) => {
				var div = root_2();

				$.transition(7, div, () => foo);
				$.append($$anchor, div);
			});

			$.append($$anchor, fragment_1);
		};

		$.if(node_1, ($$render) => {
			if (x()) $$render(consequent);
		});
	}

	$.append($$anchor, fragment);

	return $.pop($$exports);
}