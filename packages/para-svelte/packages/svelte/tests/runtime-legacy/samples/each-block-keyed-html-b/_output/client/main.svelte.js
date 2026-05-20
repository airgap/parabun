import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<div><span>hello</span> <!></div>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let names = $.prop($$props, 'names', 28, () => ['John', 'Jill']);

	var $$exports = {
		get names() {
			return names();
		},

		set names($$value) {
			names($$value);
			$.flush();
		}
	};

	var fragment = $.comment();
	var node = $.first_child(fragment);

	$.each(node, 1, names, (name) => name, ($$anchor, name) => {
		var div = root_1();
		var node_1 = $.sibling($.child(div), 2);

		$.html(node_1, () => $.get(name));
		$.reset(div);
		$.append($$anchor, div);
	});

	$.append($$anchor, fragment);

	return $.pop($$exports);
}