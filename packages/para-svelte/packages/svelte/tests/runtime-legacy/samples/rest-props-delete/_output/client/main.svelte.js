import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import App from "./App.svelte";

export default function Main($$anchor) {
	App($$anchor, { a: 1, b: 2 });
}