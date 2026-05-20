import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<p>x is greater than 10</p>`);
var root_2 = $.from_html(`<p>x is less than 5</p>`);
var root_3 = $.from_html(`<p>x is between 5 and 10</p>`);

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

	var fragment = $.comment();
	var node = $.first_child(fragment);

	{
		var consequent = ($$anchor) => {
			var p = root_1();

			$.append($$anchor, p);
		};

		var consequent_1 = ($$anchor) => {
			var p_1 = root_2();

			$.append($$anchor, p_1);
		};

		var alternate = ($$anchor) => {
			var p_2 = root_3();

			$.append($$anchor, p_2);
		};

		$.if(node, ($$render) => {
			if (x() > 10) $$render(consequent); else if (x() < 5) $$render(consequent_1, 1); else $$render(alternate, -1);
		});
	}

	$.append($$anchor, fragment);

	return $.pop($$exports);
}