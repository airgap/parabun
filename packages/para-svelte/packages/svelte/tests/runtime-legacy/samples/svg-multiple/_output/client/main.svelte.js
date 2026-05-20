import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_svg(`<svg><rect></rect></svg><svg><rect></rect></svg>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let x = $.prop($$props, 'x', 12);
	let y = $.prop($$props, 'y', 12);
	let width = $.prop($$props, 'width', 12);
	let height = $.prop($$props, 'height', 12);

	var $$exports = {
		get x() {
			return x();
		},

		set x($$value) {
			x($$value);
			$.flush();
		},

		get y() {
			return y();
		},

		set y($$value) {
			y($$value);
			$.flush();
		},

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

	var fragment = root();
	var svg = $.first_child(fragment);
	var rect = $.child(svg);

	$.reset(svg);

	var svg_1 = $.sibling(svg);
	var rect_1 = $.child(svg_1);

	$.reset(svg_1);

	$.template_effect(() => {
		$.set_attribute(rect, 'x', x());
		$.set_attribute(rect, 'y', y());
		$.set_attribute(rect, 'width', width());
		$.set_attribute(rect, 'height', height());
		$.set_attribute(rect_1, 'x', x());
		$.set_attribute(rect_1, 'y', y());
		$.set_attribute(rect_1, 'width', width());
		$.set_attribute(rect_1, 'height', height());
	});

	$.append($$anchor, fragment);

	return $.pop($$exports);
}