import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<p>welcome, dan</p>`);

export default function Child($$anchor, $$props) {
	$.push($$props, false);

	let name = $.prop($$props, 'name', 12);

	$.legacy_pre_effect(() => ($.deep_read_state(name())), () => {
		console.log('name in child: ' + name());
	});

	$.legacy_pre_effect_reset();

	var $$exports = {
		get name() {
			return name();
		},

		set name($$value) {
			name($$value);
			$.flush();
		}
	};

	var p = root();

	$.append($$anchor, p);

	return $.pop($$exports);
}