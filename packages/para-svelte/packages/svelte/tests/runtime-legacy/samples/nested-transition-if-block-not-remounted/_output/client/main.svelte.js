import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Span from './Span.svelte';

var root_1 = $.from_html(`<input/> <!>`, 1);
var root = $.from_html(`<div><!></div>`);

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

	$.init();

	var div = root();
	var node = $.child(div);

	{
		var consequent = ($$anchor) => {
			var fragment = root_1();
			var input = $.first_child(fragment);
			var node_1 = $.sibling(input, 2);

			Span(node_1, {
				children: ($$anchor, $$slotProps) => {
					$.next();

					var text = $.text('x');

					$.append($$anchor, text);
				},
				$$slots: { default: true }
			});

			$.event('input', input, () => value = this.value);
			$.append($$anchor, fragment);
		};

		$.if(node, ($$render) => {
			if (x()) $$render(consequent);
		});
	}

	$.reset(div);
	$.append($$anchor, div);

	return $.pop($$exports);
}