import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';
import { setContext } from 'svelte';

export default function Child($$anchor, $$props) {
	$.push($$props, true);

	var $$promises = $.run([
		() => Promise.resolve(),
		() => {
			try {
				setContext('potato', {});
			} catch(e) {
				console.log(e.message);
			}
		}
	]);

	$.pop();
}