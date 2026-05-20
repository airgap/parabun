import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';
import { route } from "./main.svelte";

export default function Child($$anchor, $$props) {
	$.push($$props, true);

	var $$promises = $.run([
		() => new Promise(async (_, reject) => {
			route.reject = reject;
		})
	]);

	$.pop();
}