import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<input type="number"/> <div> </div>`, 1);

export default function Main($$anchor) {
	let v = $.state(0);

	let count = {
		get v() {
			return $.get(v);
		},

		set v(x) {
			{
				$.set(v, Math.min(100, +x), true);
			}
		}
	};

	var fragment = root();
	var input = $.first_child(fragment);

	$.remove_input_defaults(input);

	var div = $.sibling(input, 2);
	var text = $.child(div, true);

	$.reset(div);
	$.template_effect(() => $.set_text(text, count.v));
	$.bind_value(input, () => count.v, ($$value) => count.v = $$value);
	$.append($$anchor, fragment);
}