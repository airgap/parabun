import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<div></div>`);

export default function Nested($$anchor, $$props) {
	$.push($$props, false);

	let things = $.prop($$props, 'things', 12);

	var $$exports = {
		get things() {
			return things();
		},

		set things($$value) {
			things($$value);
			$.flush();
		}
	};

	var div = root();

	$.each(div, 5, things, $.index, ($$anchor, thing) => {
		var fragment = $.comment();
		var node = $.first_child(fragment);

		$.slot(
			node,
			$$props,
			'foo',
			{
				get thing() {
					return $.get(thing);
				}
			},
			null
		);

		$.append($$anchor, fragment);
	});

	$.reset(div);
	$.append($$anchor, div);

	return $.pop($$exports);
}