import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<p> </p>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let _x = $.mutable_source();

	function getX() {
		return $.get(_x);
	}

	let y = $.prop($$props, 'y', 12, 1);
	let xGetter = $.mutable_source();
	let x = $.prop($$props, 'x', 12);

	$.legacy_pre_effect(() => ($.deep_read_state(y())), () => {
		$.set(_x, y() * 2);
		$.set(xGetter, getX);
	});

	$.legacy_pre_effect(() => ($.get(xGetter)), () => {
		x($.get(xGetter)());
	});

	$.legacy_pre_effect_reset();

	var $$exports = {
		get y() {
			return y();
		},

		set y($$value) {
			y($$value);
			$.flush();
		},

		get x() {
			return x();
		},

		set x($$value) {
			x($$value);
			$.flush();
		}
	};

	var p = root();
	var text = $.child(p, true);

	$.reset(p);
	$.template_effect(() => $.set_text(text, x()));
	$.append($$anchor, p);

	return $.pop($$exports);
}