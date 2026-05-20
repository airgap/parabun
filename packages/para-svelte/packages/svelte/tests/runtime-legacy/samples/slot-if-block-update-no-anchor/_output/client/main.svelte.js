import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<span><!></span>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let enabled = $.prop($$props, 'enabled', 12, false);

	var $$exports = {
		get enabled() {
			return enabled();
		},

		set enabled($$value) {
			enabled($$value);
			$.flush();
		}
	};

	var span = root();
	var node = $.child(span);

	$.slot(node, $$props, 'default', {}, ($$anchor) => {
		var fragment = $.comment();
		var node_1 = $.first_child(fragment);

		{
			var consequent = ($$anchor) => {
				var text = $.text('enabled');

				$.append($$anchor, text);
			};

			$.if(node_1, ($$render) => {
				if (enabled()) $$render(consequent);
			});
		}

		$.append($$anchor, fragment);
	});

	$.reset(span);
	$.append($$anchor, span);

	return $.pop($$exports);
}