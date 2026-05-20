import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/client';
import Nested from './Nested.svelte';

export default function Main($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, false, Main);

	let tag = $.prop($$props, 'tag', 12);

	var $$exports = {
		...$.legacy_api(),
		get tag() {
			return tag();
		},

		set tag($$value) {
			tag($$value);
			$.flush();
		}
	};

	var fragment = $.comment();
	var node = $.first_child(fragment);

	{
		$.validate_dynamic_element_tag(tag);
		$.validate_void_dynamic_element(tag);

		$.element(
			node,
			tag,
			false,
			($$element, $$anchor) => {
				$.add_svelte_meta(() => Nested($$anchor, {}), 'component', Main, 6, 29, { componentTag: 'Nested' });
			},
			void 0,
			[6, 0]
		);
	}

	$.append($$anchor, fragment);

	return $.pop($$exports);
}