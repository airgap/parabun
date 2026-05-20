import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/client';

export default function Main($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, true, Main);

	class CustomError extends Error {
		constructor() {
			super();
			Object.defineProperty(this, "message", { value: "test" });
		}
	}

	throw new CustomError();

	var $$exports = { ...$.legacy_api() };

	return $.pop($$exports);
}