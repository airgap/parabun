import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_svg(`<rect></rect>`);

export default function Rect($$anchor, $$props) {
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

	var rect = root();

	$.template_effect(() => {
		$.set_attribute(rect, 'x', x());
		$.set_attribute(rect, 'y', y());
		$.set_attribute(rect, 'width', width());
		$.set_attribute(rect, 'height', height());
	});

	$.append($$anchor, rect);

	return $.pop($$exports);
}