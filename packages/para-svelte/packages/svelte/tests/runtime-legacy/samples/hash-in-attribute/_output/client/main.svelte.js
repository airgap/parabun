import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<a> </a>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let links = $.prop($$props, 'links', 12);

	var $$exports = {
		get links() {
			return links();
		},

		set links($$value) {
			links($$value);
			$.flush();
		}
	};

	var fragment = $.comment();
	var node = $.first_child(fragment);

	$.each(node, 1, links, $.index, ($$anchor, link) => {
		var a = root_1();
		var text = $.child(a);

		$.reset(a);

		$.template_effect(() => {
			$.set_attribute(a, 'href', `x#${$.get(link) ?? ''}`);
			$.set_text(text, `x#${$.get(link) ?? ''}`);
		});

		$.append($$anchor, a);
	});

	$.append($$anchor, fragment);

	return $.pop($$exports);
}