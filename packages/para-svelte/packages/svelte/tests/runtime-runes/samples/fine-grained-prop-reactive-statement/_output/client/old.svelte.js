import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<p> </p>`);

export default function Old($$anchor, $$props) {
	$.push($$props, false);

	const count_2 = $.mutable_source();
	let prop = $.prop($$props, 'prop', 12);
	let count_1 = $.mutable_source(prop().count);

	$.legacy_pre_effect(() => ($.deep_read_state(prop())), () => {
		$.set(count_1, prop().count);
	});

	$.legacy_pre_effect(() => ($.deep_read_state(prop())), () => {
		$.set(count_2, prop().count);
	});

	$.legacy_pre_effect_reset();

	var $$exports = {
		get prop() {
			return prop();
		},

		set prop($$value) {
			prop($$value);
			$.flush();
		}
	};

	$.init();

	var p = root();
	var text = $.child(p);

	$.reset(p);
	$.template_effect(() => $.set_text(text, `${$.get(count_1) ?? ''} / ${$.get(count_2) ?? ''}`));
	$.append($$anchor, p);

	return $.pop($$exports);
}