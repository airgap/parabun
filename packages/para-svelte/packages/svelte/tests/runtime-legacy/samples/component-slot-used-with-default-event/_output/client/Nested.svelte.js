import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<button>Should not appear</button>`);
var root = $.from_html(`<p><!></p>`);

export default function Nested($$anchor, $$props) {
	function click() {}

	var p = root();
	var node = $.child(p);

	$.slot(node, $$props, 'default', {}, ($$anchor) => {
		var button = root_1();

		$.event('click', button, function ($$arg) {
			$.bubble_event.call(this, $$props, $$arg);
		});

		$.append($$anchor, button);
	});

	$.reset(p);
	$.append($$anchor, p);
}