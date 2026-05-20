import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<p> </p>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	const c = $.mutable_source();
	let a = $.prop($$props, 'a', 12, 'a');
	let b = $.mutable_source();

	function foo() {
		$.set(b, $.get(c) === 'a' ? 'b' : 'c');
	}

	foo();

	$.legacy_pre_effect(() => ($.deep_read_state(a())), () => {
		$.set(c, a());
	});

	$.legacy_pre_effect_reset();

	var $$exports = {
		get a() {
			return a();
		},

		set a($$value) {
			a($$value);
			$.flush();
		}
	};

	var p = root();
	var text = $.child(p);

	$.reset(p);
	$.template_effect(() => $.set_text(text, `${a() ?? ''}${$.get(b) ?? ''}${$.get(c) ?? ''}`));
	$.append($$anchor, p);

	return $.pop($$exports);
}