import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';
import { setContext } from "svelte";
import B from "./B.svelte";

export default function A($$anchor, $$props) {
	$.push($$props, true);

	let greeting = 'hello';

	setContext("greeting", greeting);

	var recipient;
	var $$promises = $.run([() => Promise.resolve(), () => recipient = 'world']);

	{
		$.async($$anchor, [$$promises[1]], void 0, ($$anchor) => {
			B($$anchor, {
				get recipient() {
					return recipient;
				}
			});
		});

		$.next();
	}

	$.pop();
}