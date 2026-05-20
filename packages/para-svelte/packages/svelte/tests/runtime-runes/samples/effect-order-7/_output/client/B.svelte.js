import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

export default function B($$anchor, $$props) {
	$.push($$props, true);

	$.user_pre_effect(() => {
		if ($$props.closed) $$props.close();
	});

	$.pop();
}