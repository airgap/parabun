import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';
import { setContext } from "svelte";
import C from "./C.svelte";

export default function B($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let { recipient } = $$props;

		// svelte-ignore state_referenced_locally
		setContext("recipient", recipient);

		var $$promises = $$renderer.run([() => Promise.resolve()]);

		C($$renderer, {});
	});
}