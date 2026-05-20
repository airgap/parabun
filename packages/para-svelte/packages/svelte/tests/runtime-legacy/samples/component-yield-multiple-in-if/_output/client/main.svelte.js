import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Widget from './Widget.svelte';

var root = $.from_html(`<div><!></div>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let arriving = $.prop($$props, 'arriving', 12, true);

	var $$exports = {
		get arriving() {
			return arriving();
		},

		set arriving($$value) {
			arriving($$value);
			$.flush();
		}
	};

	var div = root();
	var node = $.child(div);

	{
		var consequent = ($$anchor) => {
			Widget($$anchor, {
				children: ($$anchor, $$slotProps) => {
					$.next();

					var text = $.text('Hello');

					$.append($$anchor, text);
				},
				$$slots: { default: true }
			});
		};

		var alternate = ($$anchor) => {
			Widget($$anchor, {
				children: ($$anchor, $$slotProps) => {
					$.next();

					var text_1 = $.text('Goodbye');

					$.append($$anchor, text_1);
				},
				$$slots: { default: true }
			});
		};

		$.if(node, ($$render) => {
			if (arriving()) $$render(consequent); else $$render(alternate, -1);
		});
	}

	$.reset(div);
	$.append($$anchor, div);

	return $.pop($$exports);
}