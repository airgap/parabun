import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<p> </p>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let x = $.prop($$props, 'x', 12);
	let y = $.prop($$props, 'y', 12);
	let z = $.prop($$props, 'z', 12);

	$.legacy_pre_effect(() => ($.deep_read_state(x())), () => {
		y(x());
	});

	$.legacy_pre_effect(() => ($.deep_read_state(x())), () => {
		z(x());
	});

	$.legacy_pre_effect_reset();

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

		get z() {
			return z();
		},

		set z($$value) {
			z($$value);
			$.flush();
		}
	};

	var p = root();
	var text = $.child(p);

	$.reset(p);
	$.template_effect(() => $.set_text(text, `${x() ?? ''} ${y() ?? ''} ${z() ?? ''}`));
	$.append($$anchor, p);

	return $.pop($$exports);
}