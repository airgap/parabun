import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Rect from './Rect.svelte';

var root = $.from_svg(`<svg><!></svg>`);

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

	var svg = root();
	var node = $.child(svg);

	Rect(node, {
		get x() {
			return x();
		},

		get y() {
			return y();
		},

		get width() {
			return width();
		},

		get height() {
			return height();
		}
	});

	$.reset(svg);
	$.append($$anchor, svg);

	return $.pop($$exports);
}