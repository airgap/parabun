import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	$.legacy_pre_effect(() => {}, () => {
		document.title = 'foo';
	});

	$.legacy_pre_effect_reset();
	$.pop();
}