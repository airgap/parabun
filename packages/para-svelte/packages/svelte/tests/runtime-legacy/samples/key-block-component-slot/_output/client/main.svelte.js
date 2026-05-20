import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Component1 from './Component1.svelte';
import Component2 from './Component2.svelte';

var root = $.from_html(`<!> <button>Reset!</button>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let reset = $.mutable_source(false);
	let logs = $.prop($$props, 'logs', 12);

	var $$exports = {
		get logs() {
			return logs();
		},

		set logs($$value) {
			logs($$value);
			$.flush();
		}
	};

	var fragment = root();
	var node = $.first_child(fragment);

	Component1(node, {
		children: ($$anchor, $$slotProps) => {
			var fragment_1 = $.comment();
			var node_1 = $.first_child(fragment_1);

			$.key(node_1, () => $.get(reset), ($$anchor) => {
				Component2($$anchor, {
					get logs() {
						return logs();
					}
				});
			});

			$.append($$anchor, fragment_1);
		},
		$$slots: { default: true }
	});

	var button = $.sibling(node, 2);

	$.event('click', button, () => $.set(reset, !$.get(reset)));
	$.append($$anchor, fragment);

	return $.pop($$exports);
}