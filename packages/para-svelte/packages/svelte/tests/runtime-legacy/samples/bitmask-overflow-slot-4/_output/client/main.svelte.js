import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Echo from './Echo.svelte';

var root_1 = $.from_html(`<p> </p> <p> </p>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let _0 = $.prop($$props, '_0', 12, 0);
	let _40 = $.prop($$props, '_40', 12);

	var $$exports = {
		get _0() {
			return _0();
		},

		set _0($$value) {
			_0($$value);
			$.flush();
		},

		get _40() {
			return _40();
		},

		set _40($$value) {
			_40($$value);
			$.flush();
		}
	};

	Echo($$anchor, {
		get _40() {
			return _40();
		},
		children: $.invalid_default_snippet,
		$$slots: {
			default: ($$anchor, $$slotProps) => {
				const dummy = $.derived_safe_equal(() => $$slotProps.dummy);
				var fragment_1 = root_1();
				var p = $.first_child(fragment_1);
				var text = $.child(p, true);

				$.reset(p);

				var p_1 = $.sibling(p, 2);
				var text_1 = $.child(p_1, true);

				$.reset(p_1);

				$.template_effect(() => {
					$.set_text(text, _0());
					$.set_text(text_1, $.get(dummy));
				});

				$.append($$anchor, fragment_1);
			}
		}
	});

	return $.pop($$exports);
}