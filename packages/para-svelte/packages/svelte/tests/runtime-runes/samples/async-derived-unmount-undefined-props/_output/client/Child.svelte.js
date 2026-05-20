import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

export default function Child($$anchor, $$props) {
	$.push($$props, true);

	var // BUG: This logs 'undefined' on unmount when parent has async derived
	data;

	var $$promises = $.run([
		async () => data = await $.async_derived(() => Promise.resolve($$props.id).then((x) => {
			console.log('promise resolved with:', x);

			return x;
		}))
	]);

	$.pop();
}