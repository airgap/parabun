import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';

Test[$.FILENAME] = 'Test.svelte';

import * as $ from 'svelte/internal/client';

export default function Test($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, false, Test);

	let div = $.prop($$props, 'div', 12);

	var $$exports = {
		...$.legacy_api(),
		get div() {
			return div();
		},

		set div($$value) {
			div($$value);
			$.flush();
		}
	};

	return $.pop($$exports);
}