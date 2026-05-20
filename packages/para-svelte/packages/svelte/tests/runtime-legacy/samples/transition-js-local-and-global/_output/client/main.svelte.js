import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_2 = $.from_html(`<div>snaps if x changes</div> <div>transitions if x changes</div>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let x = $.prop($$props, 'x', 12);
	let y = $.prop($$props, 'y', 12);

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

		get y() {
			return y();
		},

		set y($$value) {
			y($$value);
			$.flush();
		}
	};

	var fragment = $.comment();
	var node_1 = $.first_child(fragment);

	{
		var consequent_1 = ($$anchor) => {
			var fragment_1 = $.comment();
			var node_2 = $.first_child(fragment_1);

			{
				var consequent = ($$anchor) => {
					var fragment_2 = root_2();
					var div = $.first_child(fragment_2);
					var div_1 = $.sibling(div, 2);

					$.transition(3, div, () => foo);
					$.transition(7, div_1, () => foo);
					$.append($$anchor, fragment_2);
				};

				$.if(node_2, ($$render) => {
					if (y()) $$render(consequent);
				});
			}

			$.append($$anchor, fragment_1);
		};

		$.if(node_1, ($$render) => {
			if (x()) $$render(consequent_1);
		});
	}

	$.append($$anchor, fragment);

	return $.pop($$exports);
}