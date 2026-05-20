import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Parent from "./Parent.svelte";

var root_2 = $.from_html(`<option> </option>`);
var root_1 = $.from_html(`<select></select>`);
var root = $.from_html(`<!> <p> </p>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let selected = $.prop($$props, 'selected', 12);
	let tasks = $.prop($$props, 'tasks', 28, () => ['do nothing']);
	let tasks_touched = $.prop($$props, 'tasks_touched', 12, 0);

	$.legacy_pre_effect(
		() => (
			$.deep_read_state(tasks()),
			$.deep_read_state(tasks_touched())
		),
		() => {
			(tasks(), $.update_prop(tasks_touched));
		}
	);

	$.legacy_pre_effect_reset();

	var $$exports = {
		get selected() {
			return selected();
		},

		set selected($$value) {
			selected($$value);
			$.flush();
		},

		get tasks() {
			return tasks();
		},

		set tasks($$value) {
			tasks($$value);
			$.flush();
		},

		get tasks_touched() {
			return tasks_touched();
		},

		set tasks_touched($$value) {
			tasks_touched($$value);
			$.flush();
		}
	};

	var fragment = root();
	var node = $.first_child(fragment);

	Parent(node, {
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

	var p = $.sibling(node, 2);
	var text_1 = $.child(p, true);

	$.reset(p);
	$.template_effect(() => $.set_text(text_1, tasks_touched()));
	$.append($$anchor, fragment);

	return $.pop($$exports);
}