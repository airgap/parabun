import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(` <select></select>`, 1);
var root = $.from_html(`<!> <button>change</button>`, 1);

export default function Main($$anchor) {
	let entries = $.state($.proxy([{ selected: 'a' }]));
	var fragment = root();
	var node = $.first_child(fragment);

	$.each(node, 17, () => $.get(entries), $.index, ($$anchor, entry, $$index) => {
		$.next();

		var fragment_1 = root_1();
		var text = $.first_child(fragment_1);
		var select = $.sibling(text);

		$.template_effect(() => $.set_text(text, `${$.get(entry).selected ?? ''} `));
		$.bind_select_value(select, () => $.get(entry).selected, ($$value) => ($.get(entry).selected = $$value));
		$.append($$anchor, fragment_1);
	});

	var button = $.sibling(node, 2);

	$.event('click', button, () => $.set(entries, [{ selected: 'a' }, { selected: 'b' }], true));
	$.append($$anchor, fragment);
}