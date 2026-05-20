import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<p> </p>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	const x1 = $.mutable_source();
	const x2 = $.mutable_source();
	let width = $.prop($$props, 'width', 12, 100);
	const padding = 10;

	$.legacy_pre_effect(() => {}, () => {
		$.set(x1, padding);
	});

	$.legacy_pre_effect(() => ($.deep_read_state(width())), () => {
		$.set(x2, width() - padding);
	});

	$.legacy_pre_effect_reset();

	var $$exports = {
		get width() {
			return width();
		},

		set width($$value) {
			width($$value);
			$.flush();
		}
	};

	var p = root();
	var text = $.child(p);

	$.reset(p);
	$.template_effect(() => $.set_text(text, `${$.get(x1) ?? ''} - ${$.get(x2) ?? ''}`));
	$.append($$anchor, p);

	return $.pop($$exports);
}