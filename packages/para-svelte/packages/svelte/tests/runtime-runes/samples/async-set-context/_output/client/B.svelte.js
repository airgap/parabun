import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';
import { setContext } from "svelte";
import C from "./C.svelte";

export default function B($$anchor, $$props) {
	$.push($$props, true);

	// svelte-ignore state_referenced_locally
	setContext("recipient", $$props.recipient);

	var $$promises = $.run([() => Promise.resolve()]);

	C($$anchor, {});
	$.pop();
}