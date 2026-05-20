import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/client';

export default function Main($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, false, Main);

	const foo1 = 42;
	let foo2 = $.prop($$props, 'bar2', 12, 42);

	var $$exports = {
		...$.legacy_api(),
		get bar1() {
			return foo1;
		},

		get bar2() {
			return foo2();
		},

		set bar2($$value) {
			foo2($$value);
			$.flush();
		}
	};

	$.bind_prop($$props, 'bar1', foo1);

	return $.pop($$exports);
}