import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<p>loading</p>`);
var root_3 = $.from_html(`<p> </p>`);
var root_2 = $.from_html(`<button>+</button> <p> </p> <!>`, 1);
var root = $.from_html(`<button>shift</button> <!>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, true);

	let input = $.state('a');
	let queue = [];

	function push(value) {
		const deferred = Promise.withResolvers();

		queue.push(() => deferred.resolve(value));

		return deferred.promise;
	}

	var fragment = root();
	var button = $.first_child(fragment);
	var node = $.sibling(button, 2);

	{
		const pending = ($$anchor) => {
			var p = root_1();

			$.append($$anchor, p);
		};

		$.boundary(node, { pending }, ($$anchor) => {
			var fragment_1 = root_2();
			var button_1 = $.first_child(fragment_1);
			var p_1 = $.sibling(button_1, 2);
			var text = $.child(p_1, true);

			$.reset(p_1);

			var node_1 = $.sibling(p_1, 2);

			{
				var consequent = ($$anchor) => {
					var p_2 = root_3();
					var text_1 = $.child(p_2, true);

					$.reset(p_2);
					$.template_effect(() => $.set_text(text_1, $.get(input)));
					$.append($$anchor, p_2);
				};

				$.if(node_1, ($$render) => {
					if (true) $$render(consequent);
				});
			}

			$.template_effect(($0) => $.set_text(text, $0), void 0, [() => push($.get(input).toUpperCase())]);
			$.delegated('click', button_1, () => $.set(input, $.get(input) + 'a'));
			$.append($$anchor, fragment_1);
		});
	}

	$.delegated('click', button, () => queue.shift()());
	$.append($$anchor, fragment);
	$.pop();
}

$.delegate(['click']);