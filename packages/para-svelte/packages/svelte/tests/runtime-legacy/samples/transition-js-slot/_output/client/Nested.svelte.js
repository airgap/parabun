import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<div><!></div>`);

export default function Nested($$anchor, $$props) {
	$.push($$props, false);

	let visible = $.prop($$props, 'visible', 12);

	var $$exports = {
		get visible() {
			return visible();
		},

		set visible($$value) {
			visible($$value);
			$.flush();
		}
	};

	var div = root();
	var node = $.child(div);

	{
		var consequent = ($$anchor) => {
			var fragment = $.comment();
			var node_1 = $.first_child(fragment);

			$.slot(node_1, $$props, 'default', {}, null);
			$.append($$anchor, fragment);
		};

		$.if(node, ($$render) => {
			if (visible()) $$render(consequent);
		});
	}

	$.reset(div);
	$.append($$anchor, div);

	return $.pop($$exports);
}