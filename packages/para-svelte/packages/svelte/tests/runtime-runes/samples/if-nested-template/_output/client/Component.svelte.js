import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

export default function Component($$anchor, $$props) {
	$.push($$props, true);

	const text = $.derived(() => $$props.value.toString());

	$.user_effect(() => console.log($.get(text)));
	$.pop();
}