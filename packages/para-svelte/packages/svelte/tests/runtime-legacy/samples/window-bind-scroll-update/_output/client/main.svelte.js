import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<div style="width: 100%; height: 9999px;"></div>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let scrollY = $.prop($$props, 'scrollY', 12);

	var $$exports = {
		get scrollY() {
			return scrollY();
		},

		set scrollY($$value) {
			scrollY($$value);
			$.flush();
		}
	};

	var div = root();

	$.bind_window_scroll('y', scrollY);
	$.append($$anchor, div);

	return $.pop($$exports);
}