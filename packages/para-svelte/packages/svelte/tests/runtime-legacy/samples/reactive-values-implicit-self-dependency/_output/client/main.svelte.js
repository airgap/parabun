import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<p> </p>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	const max = $.mutable_source();
	let num = $.prop($$props, 'num', 12, 1);

	$.legacy_pre_effect(() => ($.get(max), $.deep_read_state(num())), () => {
		$.set(max, Math.max(num(), $.get(max) || 0));
	});

	$.legacy_pre_effect_reset();

	var $$exports = {
		get num() {
			return num();
		},

		set num($$value) {
			num($$value);
			$.flush();
		}
	};

	var p = root();
	var text = $.child(p);

	$.reset(p);
	$.template_effect(() => $.set_text(text, `${num() ?? ''} / ${$.get(max) ?? ''}`));
	$.append($$anchor, p);

	return $.pop($$exports);
}