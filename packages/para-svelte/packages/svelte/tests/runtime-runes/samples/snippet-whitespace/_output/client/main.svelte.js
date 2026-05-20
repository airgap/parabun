import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/client';
import Pre from "./pre.svelte";

const snip = $.wrap_snippet(Main, function ($$anchor) {
	$.validate_snippet_args(...arguments);
	$.next();

	var text = $.text('C');

	$.append($$anchor, text);
});

var root = $.add_locations($.from_html(`A B <!> D <!>`, 1), Main[$.FILENAME], []);

export default function Main($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, true, Main);

	var $$exports = { ...$.legacy_api() };

	$.next();

	var fragment = root();
	var node = $.sibling($.first_child(fragment));

	$.add_svelte_meta(() => snip(node), 'render', Main, 8, 0);

	var node_1 = $.sibling(node, 2);

	$.add_svelte_meta(
		() => Pre(node_1, {
			children: $.wrap_snippet(Main, ($$anchor, $$slotProps) => {
				$.next();

				var text_1 = $.text('Testing\n123          ;\n    456');

				$.append($$anchor, text_1);
			}),
			$$slots: { default: true }
		}),
		'component',
		Main,
		11,
		0,
		{ componentTag: 'Pre' }
	);

	$.append($$anchor, fragment);

	return $.pop($$exports);
}