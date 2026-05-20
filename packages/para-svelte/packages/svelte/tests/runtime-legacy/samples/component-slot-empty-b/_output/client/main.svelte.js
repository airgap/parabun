import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Nested from "./Nested.svelte";

var root_1 = $.from_html(`<input slot="slot1"/>`);

export default function Main($$anchor) {
	Nested($$anchor, {
		$$slots: {
			slot1: ($$anchor, $$slotProps) => {
				var input = root_1();

				$.append($$anchor, input);
			}
		}
	});
}