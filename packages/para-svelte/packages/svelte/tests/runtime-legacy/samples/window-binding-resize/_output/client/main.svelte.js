import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<div> </div> <div> </div>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let width = $.prop($$props, 'width', 12);
	let height = $.prop($$props, 'height', 12);
	let devicePixelRatio = $.prop($$props, 'devicePixelRatio', 12);

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
		},

		get devicePixelRatio() {
			return devicePixelRatio();
		},

		set devicePixelRatio($$value) {
			devicePixelRatio($$value);
			$.flush();
		}
	};

	var fragment = root();
	var div = $.first_child(fragment);
	var text = $.child(div);

	$.reset(div);

	var div_1 = $.sibling(div, 2);
	var text_1 = $.child(div_1, true);

	$.reset(div_1);

	$.template_effect(() => {
		$.set_text(text, `${width() ?? ''}x${height() ?? ''}`);
		$.set_text(text_1, devicePixelRatio());
	});

	$.bind_window_size('innerWidth', width);
	$.bind_window_size('innerHeight', height);
	$.bind_property('devicePixelRatio', 'resize', $.window, devicePixelRatio);
	$.append($$anchor, fragment);

	return $.pop($$exports);
}