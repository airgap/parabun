import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<p>clicked!</p>`);
var root = $.from_html(`<button>click me</button> <!>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let clicked = $.prop($$props, 'clicked', 12);

	var $$exports = {
		get clicked() {
			return clicked();
		},

		set clicked($$value) {
			clicked($$value);
			$.flush();
		}
	};

	var fragment = root();
	var button = $.first_child(fragment);
	var node = $.sibling(button, 2);

	{
		var consequent = ($$anchor) => {
			var p = root_1();

			$.append($$anchor, p);
		};

		$.if(node, ($$render) => {
			if (clicked()) $$render(consequent);
		});
	}

	$.event('click', button, () => clicked(true));
	$.append($$anchor, fragment);

	return $.pop($$exports);
}