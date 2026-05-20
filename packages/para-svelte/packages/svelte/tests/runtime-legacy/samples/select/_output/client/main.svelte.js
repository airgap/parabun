import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<select><option> </option><option>Two</option><option>Three</option></select>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let item = $.prop($$props, 'item', 12);

	var $$exports = {
		get item() {
			return item();
		},

		set item($$value) {
			item($$value);
			$.flush();
		}
	};

	$.init();

	var select = root();
	var option = $.child(select);
	var text = $.child(option, true);

	$.reset(option);

	var option_value = {};
	var option_1 = $.sibling(option);

	option_1.value = option_1.__value = 'b';

	var option_2 = $.sibling(option_1);

	option_2.value = option_2.__value = 'c';
	$.reset(select);

	$.template_effect(() => {
		$.set_text(text, ($.deep_read_state(item()), $.untrack(() => item().name)));

		if (option_value !== (option_value = ($.deep_read_state(item()), $.untrack(() => item().key)))) {
			option.value = (option.__value = ($.deep_read_state(item()), $.untrack(() => item().key))) ?? '';
		}
	});

	$.append($$anchor, select);

	return $.pop($$exports);
}