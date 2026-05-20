import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<div><!> <!></div>`);

export default function Slotted($$anchor, $$props) {
	let open = $.mutable_source(false);

	function toggle() {
		$.set(open, !$.get(open));
	}

	var div = root();
	var node = $.child(div);

	$.slot(
		node,
		$$props,
		'target',
		{
			get open() {
				return $.get(open);
			}
		},
		null
	);

	var node_1 = $.sibling(node, 2);

	{
		var consequent = ($$anchor) => {
			var fragment = $.comment();
			var node_2 = $.first_child(fragment);

			$.slot(node_2, $$props, 'content', {}, null);
			$.append($$anchor, fragment);
		};

		$.if(node_1, ($$render) => {
			if ($.get(open)) $$render(consequent);
		});
	}

	$.reset(div);
	$.event('click', div, toggle);
	$.append($$anchor, div);
}