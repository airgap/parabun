import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<p> </p>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let list = [0, 1, 2, 3, 4];
	let selected = $.prop($$props, 'selected', 12, 0);

	var $$exports = {
		get selected() {
			return selected();
		},

		set selected($$value) {
			selected($$value);
			$.flush();
		}
	};

	var p = root();
	var text = $.child(p, true);

	$.reset(p);

	$.template_effect(($0) => $.set_text(text, $0), [
		() => (
			$.deep_read_state(selected()),
			$.untrack(() => list.filter((x) => x === selected()))
		)
	]);

	$.append($$anchor, p);

	return $.pop($$exports);
}