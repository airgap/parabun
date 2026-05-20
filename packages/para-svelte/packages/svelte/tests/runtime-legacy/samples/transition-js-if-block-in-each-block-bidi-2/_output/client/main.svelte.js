import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_3 = $.from_html(`<div> </div>`);
var root_5 = $.from_html(`<div> </div>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let visible = $.prop($$props, 'visible', 12);
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
		get visible() {
			return visible();
		},

		set visible($$value) {
			visible($$value);
			$.flush();
		},

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
			var consequent_1 = ($$anchor) => {
				var fragment_2 = $.comment();
				var node_3 = $.first_child(fragment_2);

				{
					var consequent = ($$anchor) => {
						var div = root_3();
						var text = $.child(div, true);

						$.reset(div);
						$.template_effect(() => $.set_text(text, number));
						$.transition(3, div, () => foo);
						$.append($$anchor, div);
					};

					$.if(node_3, ($$render) => {
						if (threshold() >= number) $$render(consequent);
					});
				}

				$.append($$anchor, fragment_2);
			};

			var alternate = ($$anchor) => {
				var fragment_3 = $.comment();
				var node_4 = $.first_child(fragment_3);

				{
					var consequent_2 = ($$anchor) => {
						var div_1 = root_5();
						var text_1 = $.child(div_1, true);

						$.reset(div_1);
						$.template_effect(() => $.set_text(text_1, number));
						$.transition(3, div_1, () => foo);
						$.append($$anchor, div_1);
					};

					$.if(node_4, ($$render) => {
						if (threshold() >= number) $$render(consequent_2);
					});
				}

				$.append($$anchor, fragment_3);
			};

			$.if(node_2, ($$render) => {
				if (visible()) $$render(consequent_1); else $$render(alternate, -1);
			});
		}

		$.append($$anchor, fragment_1);
	});

	$.append($$anchor, fragment);

	return $.pop($$exports);
}