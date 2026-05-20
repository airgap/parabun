import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<p> </p>`);
var root = $.from_html(`<button>increment</button> <!>`, 1);

export default function Main($$anchor) {
	let count = $.state(1);
	var fragment = root();
	var button = $.first_child(fragment);
	var node = $.sibling(button, 2);

	$.boundary(node, {}, ($$anchor) => {
		const double = $.derived(() => $.get(count) * 2);
		var p = root_1();
		var text = $.child(p, true);

		$.reset(p);
		$.template_effect(() => $.set_text(text, $.get(double)));
		$.append($$anchor, p);
	});

	$.delegated('click', button, () => $.update(count));
	$.append($$anchor, fragment);
}

$.delegate(['click']);