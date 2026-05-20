import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<div></div>`);
var root = $.from_html(`<button> </button> <!>`, 1);

export default function Main($$anchor) {
	let state = $.mutable_source({
		count: 0,
		attachment() {
			console.log('up');

			return () => console.log('down');
		}
	});

	var fragment = root();
	var button = $.first_child(fragment);
	var text = $.child(button, true);

	$.reset(button);

	var node = $.sibling(button, 2);

	{
		var consequent = ($$anchor) => {
			var div = root_1();

			$.attach(div, () => ($.get(state), $.untrack(() => $.get(state).attachment)));
			$.append($$anchor, div);
		};

		$.if(node, ($$render) => {
			if (($.get(state), $.untrack(() => $.get(state).count < 2))) $$render(consequent);
		});
	}

	$.template_effect(() => $.set_text(text, ($.get(state), $.untrack(() => $.get(state).count))));
	$.delegated('click', button, () => $.mutate(state, $.get(state).count++));
	$.append($$anchor, fragment);
}

$.delegate(['click']);