import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/client';

export default function Main($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, true, Main);

	var $$ownership_validator = $.create_ownership_validator($$props);
	let rows = $.prop($$props, 'rows', 31, () => $.tag_proxy($.proxy([]), 'rows'));

	$$ownership_validator.mutation('rows', ['rows', $$props.row], rows(rows()[$$props.row] = '', true), 3, 1);

	var $$exports = { ...$.legacy_api() };

	return $.pop($$exports);
}