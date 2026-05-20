import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Inner from "./Inner.svelte";

export default function Main($$anchor) {
	Inner($$anchor, {});
}