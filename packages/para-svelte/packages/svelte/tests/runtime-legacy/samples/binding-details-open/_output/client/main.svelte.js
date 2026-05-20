import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<p>hello!</p>`);
var root = $.from_html(`<details><summary>toggle</summary></details> <!>`, 1);

export default function Main($$anchor, $$props) {
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

	var fragment = root();
	var details = $.first_child(fragment);
	var node = $.sibling(details, 2);

	{
		var consequent = ($$anchor) => {
			var p = root_1();

			$.append($$anchor, p);
		};

		$.if(node, ($$render) => {
			if (visible()) $$render(consequent);
		});
	}

	$.bind_property('open', 'toggle', details, visible, visible);
	$.append($$anchor, fragment);

	return $.pop($$exports);
}