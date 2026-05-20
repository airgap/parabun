import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/client';

export default function Main($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, false, Main);

	let a = $.prop($$props, 'a', 12);

	function foo() {
		return a() + 1;
	}

	var $$exports = {
		...$.legacy_api(),
		get foo() {
			return foo;
		},

		get a() {
			return a();
		},

		set a($$value) {
			a($$value);
			$.flush();
		}
	};

	$.bind_prop($$props, 'foo', foo);

	return $.pop($$exports);
}