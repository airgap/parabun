import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import { onMount } from 'svelte';
import result from './result.js';

var root = $.from_html(`<p> </p>`);

export default function Nested($$anchor, $$props) {
	$.push($$props, false);

	let name = $.prop($$props, 'name', 12);

	onMount(() => {
		result.push(`onMount ${name()}`);
	});

	var $$exports = {
		get name() {
			return name();
		},

		set name($$value) {
			name($$value);
			$.flush();
		}
	};

	$.init();

	var p = root();
	var text = $.child(p, true);

	$.reset(p);
	$.template_effect(() => $.set_text(text, name()));
	$.append($$anchor, p);

	return $.pop($$exports);
}