import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<div> </div>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let width = $.prop($$props, 'width', 12);
	let height = $.prop($$props, 'height', 12);

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

	var div = root();

	$.event('resize', $.window, function () {
		// TODO for some reason this.innerWidth doesn't work as the this context is not the window object during test
		(width(window.innerWidth), height(window.innerHeight));
	});

	var text = $.child(div);

	$.reset(div);
	$.template_effect(() => $.set_text(text, `${width() ?? ''}x${height() ?? ''}`));
	$.append($$anchor, div);

	return $.pop($$exports);
}