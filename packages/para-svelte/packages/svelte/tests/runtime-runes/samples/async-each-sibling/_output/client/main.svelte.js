import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<li> </li>`);
var root = $.from_html(`<ul><!></ul> <button>add</button>`, 1);

export default function Main($$anchor) {
	let array = $.state($.proxy(Promise.resolve([1])));
	var fragment = root();
	var ul = $.first_child(fragment);
	var node = $.child(ul);

	$.async(node, [], [() => $.get(array)], (node, $$collection) => {
		$.each(node, 17, () => $.get($$collection), $.index, ($$anchor, item) => {
			var li = root_1();
			var text = $.child(li, true);

			$.reset(li);
			$.template_effect(() => $.set_text(text, $.get(item)));
			$.append($$anchor, li);
		});
	});

	$.reset(ul);

	var button = $.sibling(ul, 2);

	$.delegated('click', button, () => $.set(array, Promise.resolve([1, 2]), true));
	$.append($$anchor, fragment);
}

$.delegate(['click']);