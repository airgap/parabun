import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import { createEventDispatcher } from 'svelte';

var root = $.from_html(`<button></button>`);

export default function Widget($$anchor, $$props) {
	$.push($$props, false);

	const dispatch = createEventDispatcher();
	let logs = $.prop($$props, 'logs', 12);

	function click() {
		try {
			dispatch('click');
		} catch(error) {
			logs().push(error);
		}
	}

	var $$exports = {
		get logs() {
			return logs();
		},

		set logs($$value) {
			logs($$value);
			$.flush();
		}
	};

	$.init();

	var button = root();

	$.event('click', button, click);
	$.append($$anchor, button);

	return $.pop($$exports);
}