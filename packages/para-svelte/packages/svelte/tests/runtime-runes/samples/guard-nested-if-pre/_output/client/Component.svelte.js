import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

export default function Component($$anchor, $$props) {
	$.push($$props, true);

	$.user_pre_effect(() => {
		console.log('running ' + $$props.p);
	});

	$.pop();
}