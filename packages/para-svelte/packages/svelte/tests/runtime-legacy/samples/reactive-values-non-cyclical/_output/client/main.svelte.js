import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<p> </p>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let x = $.prop($$props, 'x', 12, 42);
	let a = $.mutable_source();
	let b = $.mutable_source();

	$.legacy_pre_effect(() => ($.deep_read_state(x())), () => {
		$.set(b, (function (a) {
			return a;
		})(x()));
	});

	$.legacy_pre_effect(() => ($.get(b)), () => {
		$.set(a, $.get(b));
	});

	$.legacy_pre_effect_reset();

	var $$exports = {
		get x() {
			return x();
		},

		set x($$value) {
			x($$value);
			$.flush();
		}
	};

	$.init();

	var p = root();
	var text = $.child(p);

	$.reset(p);
	$.template_effect(() => $.set_text(text, `${$.get(a) ?? ''} ${$.get(b) ?? ''}`));
	$.append($$anchor, p);

	return $.pop($$exports);
}