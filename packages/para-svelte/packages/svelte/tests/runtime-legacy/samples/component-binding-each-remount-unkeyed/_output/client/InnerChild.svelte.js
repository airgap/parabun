import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<inner> </inner>`);

export default function InnerChild($$anchor, $$props) {
	$.push($$props, false);

	let val = $.prop($$props, 'val', 12, 1);
	let increment = $.prop($$props, 'increment', 12);

	$.legacy_pre_effect(() => ($.deep_read_state(increment())), () => {
		increment()();
	});

	$.legacy_pre_effect_reset();

	var $$exports = {
		get val() {
			return val();
		},

		set val($$value) {
			val($$value);
			$.flush();
		},

		get increment() {
			return increment();
		},

		set increment($$value) {
			increment($$value);
			$.flush();
		}
	};

	$.init();

	var inner = root();
	var text = $.child(inner, true);

	$.reset(inner);
	$.template_effect(() => $.set_text(text, val()));
	$.append($$anchor, inner);

	return $.pop($$exports);
}