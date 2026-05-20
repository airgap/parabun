import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Nested from './Nested.svelte';

var root_2 = $.from_html(`<button>Show</button>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let show = $.prop($$props, 'show', 12);

	var $$exports = {
		get show() {
			return show();
		},

		set show($$value) {
			show($$value);
			$.flush();
		}
	};

	var fragment = $.comment();
	var node = $.first_child(fragment);

	{
		var consequent = ($$anchor) => {
			Nested($$anchor, {
				get show() {
					return show();
				},

				set show($$value) {
					show($$value);
				},
				$$legacy: true
			});
		};

		var alternate = ($$anchor) => {
			var button = root_2();

			$.event('click', button, () => show(true));
			$.append($$anchor, button);
		};

		$.if(node, ($$render) => {
			if (show()) $$render(consequent); else $$render(alternate, -1);
		});
	}

	$.append($$anchor, fragment);

	return $.pop($$exports);
}