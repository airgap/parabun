import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<header slot="header">header header header</header>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let tagName = $.prop($$props, 'tagName', 12, 'dynamic-element');

	var $$exports = {
		get tagName() {
			return tagName();
		},

		set tagName($$value) {
			tagName($$value);
			$.flush();
		}
	};

	var fragment = $.comment();
	var node = $.first_child(fragment);

	$.element(node, tagName, false, ($$element, $$anchor) => {
		var header = root_1();

		$.append($$anchor, header);
	});

	$.append($$anchor, fragment);

	return $.pop($$exports);
}