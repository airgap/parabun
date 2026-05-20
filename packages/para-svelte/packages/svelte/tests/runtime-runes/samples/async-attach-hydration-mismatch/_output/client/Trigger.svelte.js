import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

export default function Trigger($$anchor, $$props) {
	$.push($$props, true);

	function action() {
		return () => {};
	}

	var $$exports = { action };

	return $.pop($$exports);
}