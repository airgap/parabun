import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<p> </p>`);
var root = $.from_html(`<button>step back</button> <button>step forward</button> <button>jump back</button> <button>jump forward</button> <div></div>`, 1);

export default function Main($$anchor) {
	let items = $.state($.proxy([4, 5, 6]));
	var fragment = root();
	var button = $.first_child(fragment);
	var button_1 = $.sibling(button, 2);
	var button_2 = $.sibling(button_1, 2);
	var button_3 = $.sibling(button_2, 2);
	var div = $.sibling(button_3, 2);

	$.each(div, 20, () => $.get(items), (item) => item, ($$anchor, item) => {
		var p = root_1();
		var text = $.child(p, true);

		$.reset(p);
		$.template_effect(() => $.set_text(text, item));
		$.append($$anchor, p);
	});

	$.reset(div);

	$.delegated('click', button, () => {
		$.set(items, $.get(items).map((n) => n - 1), true);
	});

	$.delegated('click', button_1, () => {
		$.set(items, $.get(items).map((n) => n + 1), true);
	});

	$.delegated('click', button_2, () => {
		$.set(items, $.get(items).map((n) => n - 5), true);
	});

	$.delegated('click', button_3, () => {
		$.set(items, $.get(items).map((n) => n + 5), true);
	});

	$.append($$anchor, fragment);
}

$.delegate(['click']);