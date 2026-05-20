import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<div></div>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let fullscreen = $.prop($$props, 'fullscreen', 12);

	var $$exports = {
		get fullscreen() {
			return fullscreen();
		},

		set fullscreen($$value) {
			fullscreen($$value);
			$.flush();
		}
	};

	var div = root();

	$.bind_property('fullscreenElement', 'fullscreenchange', $.document, fullscreen);
	$.append($$anchor, div);

	return $.pop($$exports);
}