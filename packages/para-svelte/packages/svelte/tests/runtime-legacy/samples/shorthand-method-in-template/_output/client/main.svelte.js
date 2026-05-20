import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Foo from './Foo.svelte';

export default function Main($$anchor) {
	Foo($$anchor, {
		bar: {
			answer() {
				return 42;
			}
		}
	});
}