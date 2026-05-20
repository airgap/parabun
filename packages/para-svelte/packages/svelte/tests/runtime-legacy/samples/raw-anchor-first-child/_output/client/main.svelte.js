import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<div><!><!></div>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let raw = $.prop($$props, 'raw', 12);
	let maybe = $.prop($$props, 'maybe', 12);

	var $$exports = {
		get raw() {
			return raw();
		},

		set raw($$value) {
			raw($$value);
			$.flush();
		},

		get maybe() {
			return maybe();
		},

		set maybe($$value) {
			maybe($$value);
			$.flush();
		}
	};

	var div = root();
	var node = $.child(div);

	$.html(node, raw);

	var node_1 = $.sibling(node);

	{
		var consequent = ($$anchor) => {
			var text = $.text('after');

			$.append($$anchor, text);
		};

		$.if(node_1, ($$render) => {
			if (maybe()) $$render(consequent);
		});
	}

	$.reset(div);
	$.append($$anchor, div);

	return $.pop($$exports);
}