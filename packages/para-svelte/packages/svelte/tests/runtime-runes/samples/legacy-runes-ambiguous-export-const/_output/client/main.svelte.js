import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';
import { get, set } from "./test.svelte.js";

var root = $.from_html(`<p> </p> <button></button>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	const x = 42;
	var $$exports = { x };

	$.init();

	var fragment = root();
	var p = $.first_child(fragment);
	var text = $.child(p, true);

	$.reset(p);

	var button = $.sibling(p, 2);

	$.template_effect(($0) => $.set_text(text, $0), [() => get()]);
	$.delegated('click', button, () => set());
	$.append($$anchor, fragment);
	$.bind_prop($$props, 'x', x);

	return $.pop($$exports);
}

$.delegate(['click']);