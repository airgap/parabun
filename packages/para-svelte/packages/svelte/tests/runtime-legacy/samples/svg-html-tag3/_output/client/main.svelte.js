import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_svg(`<svg><foreignObject></foreignObject></svg>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	const circle = $.mutable_source();
	let width = $.prop($$props, 'width', 12, 100);
	let height = $.prop($$props, 'height', 12, 60);

	$.legacy_pre_effect(() => ($.deep_read_state(width()), $.deep_read_state(height())), () => {
		$.set(circle, `<circle cx="${width() / 4}" cy="${height() / 2}" r="24" fill="#FFD166"></circle>`);
	});

	$.legacy_pre_effect_reset();

	var $$exports = {
		get width() {
			return width();
		},

		set width($$value) {
			width($$value);
			$.flush();
		},

		get height() {
			return height();
		},

		set height($$value) {
			height($$value);
			$.flush();
		}
	};

	var svg = root();
	var foreignObject = $.child(svg);

	$.html(foreignObject, () => $.get(circle), true);
	$.reset(foreignObject);
	$.reset(svg);
	$.append($$anchor, svg);

	return $.pop($$exports);
}