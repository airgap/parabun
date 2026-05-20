import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import Child from './Child.svelte';
import * as $ from 'svelte/internal/client';

export let route = $.proxy({ current: 'home' });

var root_1 = $.from_html(`<p>pending</p>`);
var root_4 = $.from_html(`<p> </p>`);
var root = $.from_html(`<button>reject</button> <!>`, 1);

export default function Main($$anchor) {
	// reset from earlier tests
	route.current = 'home';

	var fragment = root();
	var button = $.first_child(fragment);
	var node = $.sibling(button, 2);

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
					Child($$anchor, {});
				};

				var alternate = ($$anchor) => {
					var p_1 = root_4();
					var text = $.child(p_1);

					$.reset(p_1);
					$.template_effect(() => $.set_text(text, `route: ${route.current ?? ''}`));
					$.append($$anchor, p_1);
				};

				$.if(node_1, ($$render) => {
					if (route.current === 'home') $$render(consequent); else $$render(alternate, -1);
				});
			}

			$.append($$anchor, fragment_1);
		});
	}

	$.delegated('click', button, () => route.reject());
	$.append($$anchor, fragment);
}

$.delegate(['click']);