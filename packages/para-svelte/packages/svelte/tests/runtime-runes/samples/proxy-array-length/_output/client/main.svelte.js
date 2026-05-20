import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<input/>`);
var root = $.from_html(`<!> <div> </div>`, 1);

export default function Main($$anchor) {
	let values = $.proxy(['foo', 'bar', 'baz']);
	let elements = $.proxy([]);
	let nums = $.proxy([1, 2, 3]);
	var fragment = root();
	var node = $.first_child(fragment);

	$.each(node, 17, () => values, $.index, ($$anchor, value, i) => {
		var input = root_1();

		$.remove_input_defaults(input);
		$.bind_this(input, ($$value, i) => elements[i] = $$value, (i) => elements?.[i], () => [i]);
		$.bind_value(input, () => values[i], ($$value) => values[i] = $$value);
		$.append($$anchor, input);
	});

	var div = $.sibling(node, 2);
	var text = $.child(div, true);

	$.reset(div);
	$.template_effect(() => $.set_text(text, elements.length));
	$.append($$anchor, fragment);
}