import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<div><!><!></div>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let maybe = $.prop($$props, 'maybe', 12);
	let raw = $.prop($$props, 'raw', 12);

	var $$exports = {
		get maybe() {
			return maybe();
		},

		set maybe($$value) {
			maybe($$value);
			$.flush();
		},

		get raw() {
			return raw();
		},

		set raw($$value) {
			raw($$value);
			$.flush();
		}
	};

	var div = root();
	var node = $.child(div);

	{
		var consequent = ($$anchor) => {
			var text = $.text('after');

			$.append($$anchor, text);
		};

		$.if(node, ($$render) => {
			if (maybe()) $$render(consequent);
		});
	}

	var node_1 = $.sibling(node);

	$.html(node_1, raw);
	$.reset(div);
	$.append($$anchor, div);

	return $.pop($$exports);
}