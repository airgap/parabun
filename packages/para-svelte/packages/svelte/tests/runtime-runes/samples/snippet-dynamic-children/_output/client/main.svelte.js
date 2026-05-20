import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';
import Button from "./Button.svelte";

var root_2 = $.from_html(`<span>showing</span>`);
var root_3 = $.from_html(`<span>hidden</span>`);

export default function Main($$anchor) {
	let show = $.state(false);

	Button($$anchor, {
		change: () => $.set(show, true),
		children: ($$anchor, $$slotProps) => {
			var fragment_1 = $.comment();
			var node = $.first_child(fragment_1);

			{
				var consequent = ($$anchor) => {
					var span = root_2();

					$.append($$anchor, span);
				};

				var alternate = ($$anchor) => {
					var span_1 = root_3();

					$.append($$anchor, span_1);
				};

				$.if(node, ($$render) => {
					if ($.get(show)) $$render(consequent); else $$render(alternate, -1);
				});
			}

			$.append($$anchor, fragment_1);
		},
		$$slots: { default: true }
	});
}