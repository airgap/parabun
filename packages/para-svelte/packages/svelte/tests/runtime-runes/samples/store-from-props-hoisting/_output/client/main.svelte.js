import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/client';
import { writable } from "svelte/store";
import Child from "./child.svelte";

export default function Main($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, true, Main);

	const attrs = writable({ count: 0 });
	var $$exports = { ...$.legacy_api() };

	$.add_svelte_meta(
		() => Child($$anchor, {
			get attrs() {
				return attrs;
			}
		}),
		'component',
		Main,
		7,
		0,
		{ componentTag: 'Child' }
	);

	return $.pop($$exports);
}