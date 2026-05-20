import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<span> </span>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let x = $.prop($$props, 'x', 12, 'waiting');
	let state = $.mutable_source();

	$.legacy_pre_effect(() => ($.deep_read_state(x())), () => {
		$.set(state, x());
	});

	$.legacy_pre_effect_reset();

	var $$exports = {
		get x() {
			return x();
		},

		set x($$value) {
			x($$value);
			$.flush();
		}
	};

	var span = root();
	var text = $.child(span, true);

	$.reset(span);
	$.template_effect(() => $.set_text(text, $.get(state)));
	$.append($$anchor, span);

	return $.pop($$exports);
}