import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<p> </p>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let a = $.prop($$props, 'a', 12, 1);
	let doubled = $.prop($$props, 'doubled', 12);

	$.legacy_pre_effect(() => ($.deep_read_state(a())), () => {
		doubled(a() * 2);
	});

	$.legacy_pre_effect_reset();

	var $$exports = {
		get a() {
			return a();
		},

		set a($$value) {
			a($$value);
			$.flush();
		},

		get doubled() {
			return doubled();
		},

		set doubled($$value) {
			doubled($$value);
			$.flush();
		}
	};

	var p = root();
	var text = $.child(p);

	$.reset(p);
	$.template_effect(() => $.set_text(text, `doubled: ${doubled() ?? ''}`));
	$.append($$anchor, p);

	return $.pop($$exports);
}