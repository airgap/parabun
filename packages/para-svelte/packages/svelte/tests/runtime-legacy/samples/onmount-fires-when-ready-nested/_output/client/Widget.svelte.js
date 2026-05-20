import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import { onMount } from 'svelte';

var root = $.from_html(`<p> </p>`);

export default function Widget($$anchor, $$props) {
	$.push($$props, false);

	let x = $.prop($$props, 'x', 12);
	let inDocument = $.prop($$props, 'inDocument', 12);

	onMount(() => {
		inDocument(document.contains(x()));
	});

	var $$exports = {
		get x() {
			return x();
		},

		set x($$value) {
			x($$value);
			$.flush();
		},

		get inDocument() {
			return inDocument();
		},

		set inDocument($$value) {
			inDocument($$value);
			$.flush();
		}
	};

	$.init();

	var p = root();
	var text = $.child(p, true);

	$.reset(p);
	$.bind_this(p, ($$value) => x($$value), () => x());
	$.template_effect(() => $.set_text(text, inDocument()));
	$.append($$anchor, p);

	return $.pop($$exports);
}