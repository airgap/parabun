import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_2 = $.from_html(`<div> </div>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let threshold = $.prop($$props, 'threshold', 12);

	function foo(node) {
		return {
			duration: 100,
			tick: (t) => {
				node.foo = t;
			}
		};
	}

	var $$exports = {
		get threshold() {
			return threshold();
		},

		set threshold($$value) {
			threshold($$value);
			$.flush();
		}
	};

	var fragment = $.comment();
	var node_1 = $.first_child(fragment);

	$.each(node_1, 0, () => [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], $.index, ($$anchor, number) => {
		var fragment_1 = $.comment();
		var node_2 = $.first_child(fragment_1);

		{
			var consequent = ($$anchor) => {
				var div = root_2();
				var text = $.child(div, true);

				$.reset(div);
				$.template_effect(() => $.set_text(text, number));
				$.transition(7, div, () => foo);
				$.append($$anchor, div);
			};

			$.if(node_2, ($$render) => {
				if (threshold() >= number) $$render(consequent);
			});
		}

		$.append($$anchor, fragment_1);
	});

	$.append($$anchor, fragment);

	return $.pop($$exports);
}