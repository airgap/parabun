import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<p>loading...</p>`);
var root_3 = $.from_html(`<p>true</p> <p> </p>`, 1);
var root_4 = $.from_html(`<p>false</p> <p> </p>`, 1);
var root = $.from_html(`<button>increment</button> <button>shift</button> <!>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, true);

	let count = $.state(0);
	let deferreds = [];

	function push() {
		const deferred = Promise.withResolvers();

		deferreds.push(deferred);

		return deferred.promise;
	}

	var fragment = root();
	var button = $.first_child(fragment);
	var button_1 = $.sibling(button, 2);
	var node = $.sibling(button_1, 2);

	{
		const pending = ($$anchor) => {
			var p = root_1();

			$.append($$anchor, p);
		};

		$.boundary(node, { pending }, ($$anchor) => {
			var fragment_1 = $.comment();
			var node_1 = $.first_child(fragment_1);

			{
				var consequent = ($$anchor) => {
					var fragment_2 = root_3();
					var p_1 = $.sibling($.first_child(fragment_2), 2);
					var text = $.child(p_1, true);

					$.reset(p_1);
					$.template_effect(($0) => $.set_text(text, $0), void 0, [() => push()]);
					$.append($$anchor, fragment_2);
				};

				var alternate = ($$anchor) => {
					var fragment_3 = root_4();
					var p_2 = $.sibling($.first_child(fragment_3), 2);
					var text_1 = $.child(p_2, true);

					$.reset(p_2);
					$.template_effect(($0) => $.set_text(text_1, $0), void 0, [() => push()]);
					$.append($$anchor, fragment_3);
				};

				$.if(node_1, ($$render) => {
					if ($.get(count) % 2 === 0) $$render(consequent); else $$render(alternate, -1);
				});
			}

			$.append($$anchor, fragment_1);
		});
	}

	$.delegated('click', button, () => $.set(count, $.get(count) + 1));
	$.delegated('click', button_1, () => deferreds.shift()?.resolve($.get(count)));
	$.append($$anchor, fragment);
	$.pop();
}

$.delegate(['click']);