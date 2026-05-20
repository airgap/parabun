import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/client';
import Widget from './Widget.svelte';

export default function Main($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, false, Main);

	let foo = $.prop($$props, 'foo', 12);

	var $$exports = {
		...$.legacy_api(),
		get foo() {
			return foo();
		},

		set foo($$value) {
			foo($$value);
			$.flush();
		}
	};

	$.add_svelte_meta(
		() => Widget($$anchor, {
			get value() {
				return `foo @ ${foo() ?? ''} # foo`;
			}
		}),
		'component',
		Main,
		6,
		0,
		{ componentTag: 'Widget' }
	);

	return $.pop($$exports);
}