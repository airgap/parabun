import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';
import Image from "./Image.svelte";
import Link from "./Link.svelte";

var root_1 = $.from_html(`<div>card</div> <!>`, 1);

export default function Main($$anchor) {
	var url;

	var $$promises = $.run([
		async () => url = await $.async_derived(() => 'https://svelte.dev')
	]);

	Link($$anchor, {
		children: ($$anchor, $$slotProps) => {
			var fragment_1 = root_1();
			var node = $.sibling($.first_child(fragment_1), 2);

			$.async(node, [$$promises[0]], void 0, ($$anchor) => {
				Image(node, {
					get src() {
						return $.get(url);
					}
				});
			});

			$.append($$anchor, fragment_1);
		},
		$$slots: { default: true }
	});
}