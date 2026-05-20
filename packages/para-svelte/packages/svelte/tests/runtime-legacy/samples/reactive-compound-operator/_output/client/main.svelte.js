import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<button>+1</button> <p> </p>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let x = $.prop($$props, 'x', 12, 0);

	$.legacy_pre_effect(() => ($.deep_read_state(x())), () => {
		x(x() * 2);
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

	var fragment = root();
	var button = $.first_child(fragment);
	var p = $.sibling(button, 2);
	var text = $.child(p);

	$.reset(p);
	$.template_effect(() => $.set_text(text, `count: ${x() ?? ''}`));
	$.event('click', button, () => x(x() + 1));
	$.append($$anchor, fragment);

	return $.pop($$exports);
}