import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';

Test[$.FILENAME] = 'Test.svelte';

import * as $ from 'svelte/internal/client';

export default function Test($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, true, Test);

	let x = $.prop($$props, 'x', 15);

	$.user_effect(() => {
		x({});
	});

	function soThatTestReturnsAnObject() {
		return x();
	}

	var $$exports = {
		...$.legacy_api(),
		get soThatTestReturnsAnObject() {
			return soThatTestReturnsAnObject;
		}
	};

	return $.pop($$exports);
}