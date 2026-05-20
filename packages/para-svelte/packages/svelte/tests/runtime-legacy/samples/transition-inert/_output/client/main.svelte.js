import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<button class="a">foo</button> <button class="b">bar</button>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let visible = $.prop($$props, 'visible', 12, true);

	function slide(_, params) {
		return params;
	}

	var $$exports = {
		get visible() {
			return visible();
		},

		set visible($$value) {
			visible($$value);
			$.flush();
		}
	};

	var fragment = $.comment();
	var node = $.first_child(fragment);

	{
		var consequent = ($$anchor) => {
			var fragment_1 = root_1();
			var button = $.first_child(fragment_1);
			var button_1 = $.sibling(button, 2);

			$.transition(3, button, () => slide, () => ({ duration: 100 }));
			$.transition(2, button_1, () => slide, () => ({ duration: 100 }));
			$.append($$anchor, fragment_1);
		};

		$.if(node, ($$render) => {
			if (visible()) $$render(consequent);
		});
	}

	$.append($$anchor, fragment);

	return $.pop($$exports);
}