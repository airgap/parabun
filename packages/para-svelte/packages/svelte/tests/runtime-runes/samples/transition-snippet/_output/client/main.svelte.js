import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';
import { fade } from 'svelte/transition';
import { linear } from 'svelte/easing';
import Container from './Container.svelte';

var root_1 = $.from_html(`<p style="opacity: 1">hello</p>`);

export default function Main($$anchor) {
	Container($$anchor, {
		children: ($$anchor, $$slotProps) => {
			var p = root_1();

			$.transition(3, p, () => fade, () => ({ duration: 100, easing: linear }));
			$.append($$anchor, p);
		},
		$$slots: { default: true }
	});
}