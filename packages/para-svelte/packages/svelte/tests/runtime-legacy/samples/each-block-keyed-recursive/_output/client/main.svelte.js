import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root_1 = $.from_html(`<div> <!></div>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let tree = $.prop($$props, 'tree', 12);

	var $$exports = {
		get tree() {
			return tree();
		},

		set tree($$value) {
			tree($$value);
			$.flush();
		}
	};

	var fragment = $.comment();
	var node = $.first_child(fragment);

	$.each(node, 3, tree, (item) => item.id, ($$anchor, item) => {
		var div = root_1();
		var text = $.child(div);
		var node_1 = $.sibling(text);

		{
			var consequent = ($$anchor) => {
				var fragment_1 = $.comment();
				var node_2 = $.first_child(fragment_1);

				Main(node_2, {
					get tree() {
						return ($.get(item), $.untrack(() => $.get(item).sub));
					}
				});

				$.append($$anchor, fragment_1);
			};

			$.if(node_1, ($$render) => {
				if (($.get(item), $.untrack(() => $.get(item).sub))) $$render(consequent);
			});
		}

		$.reset(div);
		$.template_effect(() => $.set_text(text, `${($.get(item), $.untrack(() => $.get(item).id)) ?? ''} `));
		$.append($$anchor, div);
	});

	$.append($$anchor, fragment);

	return $.pop($$exports);
}