import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Widget from './Widget.svelte';

export default function Main($$anchor, $$props) {
	Widget($$anchor, {
		$$events: {
			foo($$arg) {
				$.bubble_event.call(this, $$props, $$arg);
			}
		}
	});
}