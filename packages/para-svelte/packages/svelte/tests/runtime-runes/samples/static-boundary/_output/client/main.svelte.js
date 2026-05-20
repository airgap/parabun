import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<div>test</div>`);
var root = $.from_html(`<div><!></div>`);

export default function Main($$anchor) {
	var div = root();
	var node = $.child(div);

	$.boundary(node, {}, ($$anchor) => {
		var div_1 = root_1();

		$.append($$anchor, div_1);
	});

	$.reset(div);
	$.append($$anchor, div);
}