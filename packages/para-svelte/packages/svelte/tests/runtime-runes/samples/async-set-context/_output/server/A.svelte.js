import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';
import { setContext } from "svelte";
import B from "./B.svelte";

export default function A($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let greeting = 'hello';

		setContext("greeting", greeting);

		var recipient;
		var $$promises = $$renderer.run([() => Promise.resolve(), () => recipient = 'world']);

		$$renderer.async_block([$$promises[1]], ($$renderer) => {
			B($$renderer, { recipient });
		});
	});
}