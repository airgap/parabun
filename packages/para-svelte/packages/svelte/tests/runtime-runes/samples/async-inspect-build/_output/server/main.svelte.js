import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';

export default function Main($$renderer) {
	const test = async () => "test";
	var $$promises = $$renderer.run([test, () => void 0]);

	$$renderer.push(`<!---->works`);
}