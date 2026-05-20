import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';
import { setContext } from 'svelte';

export default function Main($$anchor, $$props) {
	$.push($$props, true);

	var $$promises = $.run([
		() => Promise.resolve('hi'),
		() => void setContext('key', 'value')
	]);

	$.pop();
}