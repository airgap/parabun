import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<b> </b>`);
var root = $.from_html(`<button>Shuffle</button><br/> <!> <br/> <!>`, 1);

export default function Main($$anchor) {
	let arr = $.state($.proxy([1, 2, 3, 4, 5]));
	let elements = $.proxy([]);
	var fragment = root();
	var button = $.first_child(fragment);
	var node = $.sibling(button, 3);

	$.each(node, 18, () => $.get(arr), (item) => item, ($$anchor, item, i) => {
		var b = root_1();
		var text = $.child(b, true);

		$.reset(b);
		$.bind_this(b, (v, i) => elements[i] = v, (i) => elements[i], () => [$.get(i)]);
		$.template_effect(() => $.set_text(text, item));
		$.append($$anchor, b);
	});

	var node_1 = $.sibling(node, 4);

	$.each(node_1, 17, () => elements, $.index, ($$anchor, elem) => {
		$.next();

		var text_1 = $.text();

		$.template_effect(() => $.set_text(text_1, $.get(elem).textContent));
		$.append($$anchor, text_1);
	});

	$.delegated('click', button, () => $.set(arr, [5, 1, 4, 2, 3], true));
	$.append($$anchor, fragment);
}

$.delegate(['click']);