import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/client';
import { setContext } from 'svelte';
import Sub from './sub.svelte';

export default function Main($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, true, Main);

	let list = $.tag_proxy($.proxy([]), 'list');

	setContext('list', list);

	var $$exports = { ...$.legacy_api() };

	$.add_svelte_meta(() => Sub($$anchor, {}), 'component', Main, 9, 0, { componentTag: 'Sub' });

	return $.pop($$exports);
}