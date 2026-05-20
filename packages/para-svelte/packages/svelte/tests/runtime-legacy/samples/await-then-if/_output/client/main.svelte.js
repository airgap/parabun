import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_2 = $.from_html(`<p>promise array is empty</p>`);
var root_3 = $.from_html(`<p>promise array is not empty</p>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let thePromise = $.prop($$props, 'thePromise', 12);

	var $$exports = {
		get thePromise() {
			return thePromise();
		},

		set thePromise($$value) {
			thePromise($$value);
			$.flush();
		}
	};

	var fragment = $.comment();
	var node = $.first_child(fragment);

	$.await(
		node,
		thePromise,
		($$anchor) => {
			var text = $.text('loading...');

			$.append($$anchor, text);
		},
		($$anchor, r) => {
			var fragment_1 = $.comment();
			var node_1 = $.first_child(fragment_1);

			{
				var consequent = ($$anchor) => {
					var p = root_2();

					$.append($$anchor, p);
				};

				var alternate = ($$anchor) => {
					var p_1 = root_3();

					$.append($$anchor, p_1);
				};

				$.if(node_1, ($$render) => {
					if ((
						$.deep_read_state($.get(r)),
						$.untrack(() => $.get(r).length < 1)
					)) $$render(consequent); else $$render(alternate, -1);
				});
			}

			$.append($$anchor, fragment_1);
		}
	);

	$.append($$anchor, fragment);

	return $.pop($$exports);
}