import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';

Passthrough[$.FILENAME] = 'passthrough.svelte';

import * as $ from 'svelte/internal/client';

var root = $.add_locations($.from_html(`<!> <!>`, 1), Passthrough[$.FILENAME], []);

export default function Passthrough($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, true, Passthrough);

	var $$exports = { ...$.legacy_api() };
	var fragment = root();
	var node = $.first_child(fragment);

	$.add_svelte_meta(() => $.snippet(node, () => $$props.children ?? $.noop), 'render', Passthrough, 5, 0);

	var node_1 = $.sibling(node, 2);

	{
		var consequent = ($$anchor) => {
			var fragment_1 = $.comment();
			var node_2 = $.first_child(fragment_1);

			$.add_svelte_meta(() => $.snippet(node_2, () => $$props.named ?? $.noop), 'render', Passthrough, 8, 1);
			$.append($$anchor, fragment_1);
		};

		$.add_svelte_meta(
			() => $.if(node_1, ($$render) => {
				if (true) $$render(consequent);
			}),
			'if',
			Passthrough,
			7,
			0
		);
	}

	$.append($$anchor, fragment);

	return $.pop($$exports);
}