import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Parent from "./Parent.svelte";

var root_2 = $.from_html(`<option> </option>`);
var root_1 = $.from_html(`<select></select>`);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let selected = $.prop($$props, 'selected', 12);

	var $$exports = {
		get selected() {
			return selected();
		},

		set selected($$value) {
			selected($$value);
			$.flush();
		}
	};

	Parent($$anchor, {
		children: $.invalid_default_snippet,
		$$slots: {
			default: ($$anchor, $$slotProps) => {
				const tasks = $.derived_safe_equal(() => $$slotProps.tasks);
				var select = root_1();

				$.each(select, 5, () => $.get(tasks), $.index, ($$anchor, task) => {
					var option = root_2();
					var text = $.child(option, true);

					$.reset(option);

					var option_value = {};

					$.template_effect(() => {
						$.set_text(text, $.get(task));

						if (option_value !== (option_value = $.get(task))) {
							option.value = (option.__value = $.get(task)) ?? '';
						}
					});

					$.append($$anchor, option);
				});

				$.reset(select);
				$.bind_select_value(select, selected);
				$.append($$anchor, select);
			}
		}
	});

	return $.pop($$exports);
}