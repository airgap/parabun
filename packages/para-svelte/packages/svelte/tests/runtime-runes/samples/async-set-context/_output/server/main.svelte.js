import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';
import A from "./A.svelte";

export default function Main($$renderer) {
	var $$promises = $$renderer.run([() => Promise.resolve()]);

	A($$renderer, {});
}