import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import { onDestroy } from 'svelte';

export default function Child($$anchor, $$props) {
	$.push($$props, false);

	let data = $.prop($$props, 'data', 12);

	onDestroy(() => {
		data();
	});

	var $$exports = {
		get data() {
			return data();
		},

		set data($$value) {
			data($$value);
			$.flush();
		}
	};

	$.init();
	$.next();

	var text = $.text();

	$.template_effect(() => $.set_text(text, data() ? '' : null));
	$.append($$anchor, text);

	return $.pop($$exports);
}