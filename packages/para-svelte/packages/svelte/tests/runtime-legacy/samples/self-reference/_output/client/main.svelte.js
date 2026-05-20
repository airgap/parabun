import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<span> </span> <!>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let depth = $.prop($$props, 'depth', 12);

	var $$exports = {
		get depth() {
			return depth();
		},

		set depth($$value) {
			depth($$value);
			$.flush();
		}
	};

	var fragment = root();
	var span = $.first_child(fragment);
	var text = $.child(span, true);

	$.reset(span);

	var node = $.sibling(span, 2);

	{
		var consequent = ($$anchor) => {
			var fragment_1 = $.comment();
			var node_1 = $.first_child(fragment_1);

			{
				let $0 = $.derived_safe_equal(() => depth() - 1);

				Main(node_1, {
					get depth() {
						return $.get($0);
					}
				});
			}

			$.append($$anchor, fragment_1);
		};

		$.if(node, ($$render) => {
			if (depth() > 0) $$render(consequent);
		});
	}

	$.template_effect(() => $.set_text(text, depth()));
	$.append($$anchor, fragment);

	return $.pop($$exports);
}