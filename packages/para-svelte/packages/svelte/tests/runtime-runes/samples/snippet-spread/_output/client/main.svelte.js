import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';
import Button from './Button.svelte';

export default function Main($$anchor) {
	Button($$anchor, {
		children: ($$anchor, $$slotProps) => {
			$.next();

			var text = $.text('hello');

			$.append($$anchor, text);
		},
		$$slots: { default: true }
	});
}