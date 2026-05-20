import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

export default function Modal($$anchor, $$props) {
	$.push($$props, false);

	let hidden = $.prop($$props, 'hidden', 12, true);

	function toggle() {
		hidden(!hidden());
	}

	var $$exports = {
		toggle,
		get hidden() {
			return hidden();
		},

		set hidden($$value) {
			hidden($$value);
			$.flush();
		}
	};

	var fragment = $.comment();
	var node = $.first_child(fragment);

	{
		var consequent = ($$anchor) => {
			var fragment_1 = $.comment();
			var node_1 = $.first_child(fragment_1);

			$.slot(node_1, $$props, 'default', {}, null);
			$.append($$anchor, fragment_1);
		};

		$.if(node, ($$render) => {
			if (!hidden()) $$render(consequent);
		});
	}

	$.append($$anchor, fragment);
	$.bind_prop($$props, 'toggle', toggle);

	return $.pop($$exports);
}