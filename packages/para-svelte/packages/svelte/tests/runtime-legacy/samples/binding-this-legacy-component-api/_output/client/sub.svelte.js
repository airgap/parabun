import { createClassComponent as $$_createClassComponent } from 'svelte/legacy';
import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import { createEventDispatcher } from 'svelte';

var root = $.from_html(`<button> </button>`);

export default function Sub($$anchor, $$props) {
	if (new.target) return $$_createClassComponent({ component: Sub, ...$$anchor });

	$.push($$props, false);

	let count = $.prop($$props, 'count', 12, 0);
	const dispatch = createEventDispatcher();

	var $$exports = {
		get count() {
			return count();
		},

		set count($$value) {
			count($$value);
			$.flush();
		},
		$set: $.update_legacy_props,
		$on: ($$event_name, $$event_cb) => $.add_legacy_event_listener($$props, $$event_name, $$event_cb)
	};

	$.init();

	var button = root();
	var text = $.child(button, true);

	$.reset(button);
	$.template_effect(() => $.set_text(text, count()));
	$.event('click', button, () => dispatch('increment', 1));
	$.append($$anchor, button);

	return $.pop($$exports);
}