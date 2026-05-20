import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_2 = $.from_html(`<p> </p>`);
var root_3 = $.from_html(`<p>nothing</p>`);
var root_1 = $.from_html(`<!> <p>after</p>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let visible = $.prop($$props, 'visible', 12, true);
	const empty = [];

	var $$exports = {
		get visible() {
			return visible();
		},

		set visible($$value) {
			visible($$value);
			$.flush();
		}
	};

	var fragment = $.comment();
	var node = $.first_child(fragment);

	{
		var consequent = ($$anchor) => {
			var fragment_1 = root_1();
			var node_1 = $.first_child(fragment_1);

			$.each(
				node_1,
				1,
				() => empty,
				$.index,
				($$anchor, item) => {
					var p = root_2();
					var text = $.child(p, true);

					$.reset(p);
					$.template_effect(() => $.set_text(text, $.get(item)));
					$.append($$anchor, p);
				},
				($$anchor) => {
					var p_1 = root_3();

					$.append($$anchor, p_1);
				}
			);

			$.next(2);
			$.append($$anchor, fragment_1);
		};

		$.if(node, ($$render) => {
			if (visible()) $$render(consequent);
		});
	}

	$.append($$anchor, fragment);

	return $.pop($$exports);
}