import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/client';

export default function Main($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, false, Main);

	const foo1 = 42;
	const foo2 = () => 42;
	let bar = $.prop($$props, 'bar', 8, 42);

	var $$exports = {
		...$.legacy_api(),
		get foo1() {
			return foo1;
		},

		get foo2() {
			return foo2;
		}
	};

	$.bind_prop($$props, 'foo1', foo1);
	$.bind_prop($$props, 'foo2', foo2);

	return $.pop($$exports);
}