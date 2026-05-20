import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

export default function Component($$anchor, $$props) {
	$.push($$props, true);

	const props = $.rest_props($$props, ['$$slots', '$$events', '$$legacy']);

	// svelte-ignore state_referenced_locally
	const name = $$props.name;

	var $$exports = { name };

	return $.pop($$exports);
}