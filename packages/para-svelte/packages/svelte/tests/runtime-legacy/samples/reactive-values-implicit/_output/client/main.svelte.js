import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<p> </p> <p> </p>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	const c = $.mutable_source();
	const cSquared = $.mutable_source();
	let a = $.prop($$props, 'a', 12, 1);
	let b = $.prop($$props, 'b', 12, 2);

	$.legacy_pre_effect(() => ($.deep_read_state(a()), $.deep_read_state(b())), () => {
		$.set(c, a() + b());
	});

	$.legacy_pre_effect(() => ($.get(c)), () => {
		$.set(cSquared, $.get(c) * $.get(c));
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

		get b() {
			return b();
		},

		set b($$value) {
			b($$value);
			$.flush();
		}
	};

	var fragment = root();
	var p = $.first_child(fragment);
	var text = $.child(p);

	$.reset(p);

	var p_1 = $.sibling(p, 2);
	var text_1 = $.child(p_1);

	$.reset(p_1);

	$.template_effect(() => {
		$.set_text(text, `${a() ?? ''} + ${b() ?? ''} = ${$.get(c) ?? ''}`);
		$.set_text(text_1, `${$.get(c) ?? ''} * ${$.get(c) ?? ''} = ${$.get(cSquared) ?? ''}`);
	});

	$.append($$anchor, fragment);

	return $.pop($$exports);
}