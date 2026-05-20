import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<div><div class="svelte-1hvyz3y"> </div></div>`);

export default function _unknown_($$anchor, $$props) {
	$.push($$props, false);

	let offsetHeight = $.prop($$props, 'offsetHeight', 12);
	let offsetWidth = $.prop($$props, 'offsetWidth', 12);
	let toggle = $.prop($$props, 'toggle', 12, false);

	$.legacy_pre_effect(() => ($.deep_read_state(offsetWidth())), () => {
		if (offsetWidth()) {
			toggle(true);
		}
	});

	$.legacy_pre_effect_reset();

	var $$exports = {
		get offsetHeight() {
			return offsetHeight();
		},

		set offsetHeight($$value) {
			offsetHeight($$value);
			$.flush();
		},

		get offsetWidth() {
			return offsetWidth();
		},

		set offsetWidth($$value) {
			offsetWidth($$value);
			$.flush();
		},

		get toggle() {
			return toggle();
		},

		set toggle($$value) {
			toggle($$value);
			$.flush();
		}
	};

	var div = root();
	let classes;
	var div_1 = $.child(div);
	var text = $.child(div_1, true);

	$.reset(div_1);
	$.reset(div);

	$.template_effect(() => {
		classes = $.set_class(div, 1, 'svelte-1hvyz3y', null, classes, { toggle: toggle() });
		$.set_text(text, offsetHeight());
	});

	$.bind_element_size(div_1, 'offsetHeight', offsetHeight);
	$.bind_element_size(div_1, 'offsetWidth', offsetWidth);
	$.append($$anchor, div);

	return $.pop($$exports);
}