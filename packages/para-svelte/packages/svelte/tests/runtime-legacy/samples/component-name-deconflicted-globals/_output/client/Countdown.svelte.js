import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<span> </span> <!>`, 1);

export default function Countdown_1($$anchor, $$props) {
	$.push($$props, false);

	let count = $.prop($$props, 'count', 12);

	var $$exports = {
		get count() {
			return count();
		},

		set count($$value) {
			count($$value);
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
			{
				let $0 = $.derived_safe_equal(() => count() - 1);

				Countdown($$anchor, {
					get count() {
						return $.get($0);
					}
				});
			}
		};

		$.if(node, ($$render) => {
			if (count() > 1) $$render(consequent);
		});
	}

	$.template_effect(() => $.set_text(text, count()));
	$.append($$anchor, fragment);

	return $.pop($$exports);
}