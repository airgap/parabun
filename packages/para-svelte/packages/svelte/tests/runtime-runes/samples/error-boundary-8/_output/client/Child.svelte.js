import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

export default function Child($$anchor, $$props) {
	$.push($$props, true);

	$.user_pre_effect(() => {
		throw new Error('oh noes');
	});

	$.pop();
}