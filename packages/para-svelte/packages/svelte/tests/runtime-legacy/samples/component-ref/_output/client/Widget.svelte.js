import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import { onMount } from 'svelte';

var root = $.from_html(`<p>i am a widget</p>`);

export default function Widget($$anchor, $$props) {
	$.push($$props, false);

	let isWidget = $.prop($$props, 'isWidget', 12);

	onMount(() => {
		isWidget(true);
	});

	var $$exports = {
		get isWidget() {
			return isWidget();
		},

		set isWidget($$value) {
			isWidget($$value);
			$.flush();
		}
	};

	$.init();

	var p = root();

	$.append($$anchor, p);

	return $.pop($$exports);
}