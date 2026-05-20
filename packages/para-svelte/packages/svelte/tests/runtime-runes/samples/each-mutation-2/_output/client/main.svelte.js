import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<p> </p>`);
var root = $.from_html(`<button>push</button> <button>pop</button> <!>`, 1);

export default function Main($$anchor) {
	let numbers = $.proxy([{ id: 1 }, { id: 2 }, { id: 3 }]);
	var fragment = root();
	var button = $.first_child(fragment);
	var button_1 = $.sibling(button, 2);
	var node = $.sibling(button_1, 2);

	$.each(node, 17, () => numbers, $.index, ($$anchor, number) => {
		var p = root_1();
		var text = $.child(p, true);

		$.reset(p);
		$.template_effect(() => $.set_text(text, $.get(number).id));
		$.append($$anchor, p);
	});

	$.delegated('click', button, () => numbers.push({ id: numbers.length + 1 }));
	$.delegated('click', button_1, () => numbers.pop());
	$.append($$anchor, fragment);
}

$.delegate(['click']);