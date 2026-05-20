import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<p> </p>`);
var root = $.from_html(`<button>delete</button> <!>`, 1);

export default function Main($$anchor) {
	let obj = $.proxy({ test: 0 });
	let keys = $.derived(() => Object.keys(obj));
	var fragment = root();
	var button = $.first_child(fragment);
	var node = $.sibling(button, 2);

	$.each(node, 17, () => $.get(keys), $.index, ($$anchor, key) => {
		var p = root_1();
		var text = $.child(p, true);

		$.reset(p);
		$.template_effect(() => $.set_text(text, $.get(key)));
		$.append($$anchor, p);
	});

	$.delegated('click', button, () => delete obj.test);
	$.append($$anchor, fragment);
}

$.delegate(['click']);