import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import Modal from './Modal.svelte';

var root_2 = $.from_html(`<option> </option>`);
var root_1 = $.from_html(`<span> </span> <select></select>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	let modal = $.prop($$props, 'modal', 12);
	let letter = $.prop($$props, 'letter', 12);
	let letters = $.prop($$props, 'letters', 28, () => ['a', 'b', 'c']);

	var $$exports = {
		get modal() {
			return modal();
		},

		set modal($$value) {
			modal($$value);
			$.flush();
		},

		get letter() {
			return letter();
		},

		set letter($$value) {
			letter($$value);
			$.flush();
		},

		get letters() {
			return letters();
		},

		set letters($$value) {
			letters($$value);
			$.flush();
		}
	};

	$.bind_this(
		Modal($$anchor, {
			children: ($$anchor, $$slotProps) => {
				var fragment_1 = root_1();
				var span = $.first_child(fragment_1);
				var text = $.child(span, true);

				$.reset(span);

				var select = $.sibling(span, 2);

				$.each(select, 5, letters, $.index, ($$anchor, letter, $$index, $$array) => {
					var option = root_2();
					var text_1 = $.child(option, true);

					$.reset(option);

					var option_value = {};

					$.template_effect(() => {
						$.set_text(text_1, $.get(letter));

						if (option_value !== (option_value = $.get(letter))) {
							option.value = (option.__value = $.get(letter)) ?? '';
						}
					});

					$.append($$anchor, option);
				});

				$.reset(select);
				$.template_effect(() => $.set_text(text, letter()));
				$.bind_select_value(select, letter);
				$.append($$anchor, fragment_1);
			},
			$$slots: { default: true },
			$$legacy: true
		}),
		($$value) => modal($$value),
		() => modal()
	);

	return $.pop($$exports);
}