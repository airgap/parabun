import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`before-<!>-after`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let x = $.prop($$props, 'x', 12);

	var $$exports = {
		get x() {
			return x();
		},

		set x($$value) {
			x($$value);
			$.flush();
		}
	};

	$.next();

	var fragment = root();
	var node = $.sibling($.first_child(fragment));

	{
		var consequent = ($$anchor) => {
			var text = $.text('if');

			$.append($$anchor, text);
		};

		var consequent_1 = ($$anchor) => {
			var text_1 = $.text('elseif');

			$.append($$anchor, text_1);
		};

		var alternate = ($$anchor) => {
			var text_2 = $.text('else');

			$.append($$anchor, text_2);
		};

		$.if(node, ($$render) => {
			if (x() > 10) $$render(consequent); else if (x() < 5) $$render(consequent_1, 1); else $$render(alternate, -1);
		});
	}

	$.next();
	$.append($$anchor, fragment);

	return $.pop($$exports);
}