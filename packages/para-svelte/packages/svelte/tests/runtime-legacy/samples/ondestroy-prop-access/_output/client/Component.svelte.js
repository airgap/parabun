import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import { onDestroy } from "svelte";

var root = $.from_html(`<p> </p> <button></button>`, 1);

export default function Component($$anchor, $$props) {
	$.push($$props, false);

	let checked = $.prop($$props, 'checked', 12);
	let count = $.prop($$props, 'count', 12);

	onDestroy(() => {
		console.log(count(), checked());
	});

	var $$exports = {
		get checked() {
			return checked();
		},

		set checked($$value) {
			checked($$value);
			$.flush();
		},

		get count() {
			return count();
		},

		set count($$value) {
			count($$value);
			$.flush();
		}
	};

	$.init();

	var fragment = root();
	var p = $.first_child(fragment);
	var text = $.child(p, true);

	$.reset(p);

	var button = $.sibling(p, 2);

	$.template_effect(() => $.set_text(text, count()));
	$.delegated('click', button, () => $.update_prop(count, -1));
	$.append($$anchor, fragment);

	return $.pop($$exports);
}

$.delegate(['click']);