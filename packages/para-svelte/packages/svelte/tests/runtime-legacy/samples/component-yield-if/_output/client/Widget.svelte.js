import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<p><!></p>`);

export default function Widget($$anchor, $$props) {
	$.push($$props, false);

	let show = $.prop($$props, 'show', 12, false);

	var $$exports = {
		get show() {
			return show();
		},

		set show($$value) {
			show($$value);
			$.flush();
		}
	};

	var p = root();
	var node = $.child(p);

	{
		var consequent = ($$anchor) => {
			var fragment = $.comment();
			var node_1 = $.first_child(fragment);

			$.slot(node_1, $$props, 'default', {}, null);
			$.append($$anchor, fragment);
		};

		$.if(node, ($$render) => {
			if (show()) $$render(consequent);
		});
	}

	$.reset(p);
	$.append($$anchor, p);

	return $.pop($$exports);
}