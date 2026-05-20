import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_2 = $.from_html(`<p>OK</p> <!>`, 1);
var root_3 = $.from_html(`<pre> </pre>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let a = () => true;
	let data = $.prop($$props, 'data', 28, () => [{ foo: [{ foo: [{ bar: "one" }, { bar: "two" }] }] }]);

	var $$exports = {
		get data() {
			return data();
		},

		set data($$value) {
			data($$value);
			$.flush();
		}
	};

	var fragment = $.comment();
	var node = $.first_child(fragment);

	$.each(node, 1, data, $.index, ($$anchor, datum) => {
		var fragment_1 = $.comment();
		var node_1 = $.first_child(fragment_1);

		{
			var consequent = ($$anchor) => {
				var fragment_2 = root_2();
				var node_2 = $.sibling($.first_child(fragment_2), 2);

				Main(node_2, {
					get data() {
						return ($.get(datum), $.untrack(() => $.get(datum).foo));
					}
				});

				$.append($$anchor, fragment_2);
			};

			var d = $.derived(() => ($.get(datum), $.untrack(() => $.get(datum).foo && a())));

			var alternate = ($$anchor) => {
				var pre = root_3();
				var text = $.child(pre, true);

				$.reset(pre);
				$.template_effect(() => $.set_text(text, ($.get(datum), $.untrack(() => $.get(datum).bar))));
				$.append($$anchor, pre);
			};

			$.if(node_1, ($$render) => {
				if ($.get(d)) $$render(consequent); else $$render(alternate, -1);
			});
		}

		$.append($$anchor, fragment_1);
	});

	$.append($$anchor, fragment);

	return $.pop($$exports);
}