import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<button>Click</button>`);

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

	var button = root();

	$.bind_window_size('innerWidth', width);
	$.bind_window_size('innerHeight', height);
	$.event('click', button, () => {});
	$.append($$anchor, button);

	return $.pop($$exports);
}