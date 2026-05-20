import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/client';
import { setContext, getContext } from "svelte";

export default function Main($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, true, Main);

	setContext("", new Proxy({}, {
		get() {
			return {};
		}
	}));

	getContext("");

	var $$exports = { ...$.legacy_api() };

	return $.pop($$exports);
}