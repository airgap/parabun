import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';

export default function Child($$renderer) {
	var $$promises = $$renderer.run([() => 1]);
}