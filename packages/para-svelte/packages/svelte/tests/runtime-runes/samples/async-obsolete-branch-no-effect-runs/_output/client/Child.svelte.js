import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

export default function Child($$anchor, $$props) {
	$.push($$props, true);

	let double = $.derived(() => $$props.count * 2);

	$.user_pre_effect(() => console.log($$props.count, $.get(double)));
	$.pop();
}