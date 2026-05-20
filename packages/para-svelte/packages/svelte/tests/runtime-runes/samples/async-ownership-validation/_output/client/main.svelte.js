import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/client';
import Child from './Child.svelte';

var root_1 = $.add_locations($.from_html(`<p>loading...</p>`), Main[$.FILENAME], [[11, 2]]);

export default function Main($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, true, Main);

	let object = $.tag_proxy($.proxy({ count: 0 }), 'object');
	var $$exports = { ...$.legacy_api() };
	var fragment = $.comment();
	var node = $.first_child(fragment);

	{
		const pending = $.wrap_snippet(Main, function ($$anchor) {
			$.validate_snippet_args(...arguments);

			var p = root_1();

			$.append($$anchor, p);
		});

		$.boundary(node, { pending }, ($$anchor) => {
			$.add_svelte_meta(
				() => Child($$anchor, {
					get object() {
						return object;
					}
				}),
				'component',
				Main,
				8,
				1,
				{ componentTag: 'Child' }
			);
		});
	}

	$.append($$anchor, fragment);

	return $.pop($$exports);
}