import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import { onMount } from 'svelte';

export default function Component($$anchor, $$props) {
	$.push($$props, false);

	let logs = $.prop($$props, 'logs', 12);
	let state = $.prop($$props, 'state', 12);

	onMount(() => {
		logs().push(`mount ${state()}`);

		return () => {
			logs().push(`unmount ${state()}`);
		};
	});

	var $$exports = {
		get logs() {
			return logs();
		},

		set logs($$value) {
			logs($$value);
			$.flush();
		},

		get state() {
			return state();
		},

		set state($$value) {
			state($$value);
			$.flush();
		}
	};

	$.init();
	$.next();

	var text = $.text();

	$.template_effect(() => $.set_text(text, state()));
	$.append($$anchor, text);

	return $.pop($$exports);
}