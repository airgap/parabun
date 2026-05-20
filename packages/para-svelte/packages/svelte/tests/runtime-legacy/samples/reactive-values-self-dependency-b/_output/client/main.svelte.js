import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<p> </p>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let count = $.prop($$props, 'count', 12, 0);

	$.legacy_pre_effect(() => ($.deep_read_state(count())), () => {
		if (count() >= 10) {
			count(9);
		}
	});

	$.legacy_pre_effect_reset();

	var $$exports = {
		get count() {
			return count();
		},

		set count($$value) {
			count($$value);
			$.flush();
		}
	};

	var p = root();
	var text = $.child(p);

	$.reset(p);
	$.template_effect(() => $.set_text(text, `count: ${count() ?? ''}`));
	$.append($$anchor, p);

	return $.pop($$exports);
}