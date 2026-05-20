import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import { onDestroy } from 'svelte';

export default function Component($$anchor, $$props) {
	$.push($$props, false);

	let my_prop = $.prop($$props, 'my_prop', 12);

	onDestroy(() => {
		console.log(my_prop().foo);
	});

	var $$exports = {
		get my_prop() {
			return my_prop();
		},

		set my_prop($$value) {
			my_prop($$value);
			$.flush();
		}
	};

	$.init();
	$.next();

	var text = $.text();

	$.template_effect(() => $.set_text(text, ($.deep_read_state(my_prop()), $.untrack(() => my_prop().foo))));
	$.append($$anchor, text);

	return $.pop($$exports);
}