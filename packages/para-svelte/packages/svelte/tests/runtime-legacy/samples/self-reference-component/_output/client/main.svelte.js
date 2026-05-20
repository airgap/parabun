import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Countdown from './Countdown.svelte';

var root = $.from_html(` <!>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let count = $.prop($$props, 'count', 12, 5);

	var $$exports = {
		get count() {
			return count();
		},

		set count($$value) {
			count($$value);
			$.flush();
		}
	};

	$.next();

	var fragment = root();
	var text = $.first_child(fragment);
	var node = $.sibling(text);

	Countdown(node, {
		get count() {
			return count();
		},
		children: $.invalid_default_snippet,
		$$slots: {
			default: ($$anchor, $$slotProps) => {
				const count = $.derived_safe_equal(() => $$slotProps.count);
				var fragment_1 = $.comment();
				var node_1 = $.first_child(fragment_1);

				Main(node_1, {
					get count() {
						return $.get(count);
					}
				});

				$.append($$anchor, fragment_1);
			}
		}
	});

	$.template_effect(() => $.set_text(text, `${count() ?? ''} `));
	$.append($$anchor, fragment);

	return $.pop($$exports);
}