import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';
import A from "./A.svelte";

export default function Main($$anchor) {
	var $$promises = $.run([() => Promise.resolve()]);

	A($$anchor, {});
}