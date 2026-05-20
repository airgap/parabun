import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';
import Child from './Child.svelte';

var root_1 = $.from_html(`<p>pending</p>`);
var root_3 = $.from_html(`<p> </p> <!>`, 1);
var root = $.from_html(`<button>toggle</button> <button>hello</button> <!>`, 1);

export default function Main($$anchor) {
	let condition = $.state(false);
	let deferred = $.proxy(Promise.withResolvers());
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
					var p_1 = $.first_child(fragment_2);
					var text = $.child(p_1);

					$.reset(p_1);

					var node_2 = $.sibling(p_1, 2);

					Child(node_2, {
						get promise() {
							return deferred.promise;
						}
					});

					$.template_effect(() => $.set_text(text, `condition is ${$.get(condition) ?? ''}`));
					$.append($$anchor, fragment_2);
				};

				$.if(node_1, ($$render) => {
					if ($.get(condition)) $$render(consequent);
				});
			}

			$.append($$anchor, fragment_1);
		});
	}

	$.delegated('click', button, () => $.set(condition, !$.get(condition)));
	$.delegated('click', button_1, () => deferred.resolve('hello'));
	$.append($$anchor, fragment);
}

$.delegate(['click']);