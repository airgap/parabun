import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

export default function Main($$anchor) {
	const foo = {
		async bar() {
			await baz;
		},

		*qux() {
			yield 42;
		}
	};
}