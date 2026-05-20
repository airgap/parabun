import { createClassComponent as $$_createClassComponent } from 'svelte/legacy';
import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<p> </p>`);

export default function Inner($$anchor, $$props) {
	if (new.target) return $$_createClassComponent({ component: Inner, ...$$anchor });

	$.push($$props, true);

	let num = $.prop($$props, 'num', 7);

	var $$exports = {
		get num() {
			return num();
		},

		set num($$value) {
			num($$value);
			$.flush();
		},
		$set: $.update_legacy_props,
		$on: ($$event_name, $$event_cb) => $.add_legacy_event_listener($$props, $$event_name, $$event_cb)
	};

	var p = root();
	var text = $.child(p, true);

	$.reset(p);
	$.template_effect(() => $.set_text(text, num()));
	$.append($$anchor, p);

	return $.pop($$exports);
}