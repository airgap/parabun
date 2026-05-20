import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<input/> <input/> <input/> <input/> <input/> <input/>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	const binding_group = [];
	const binding_group_1 = [];
	let radio = $.prop($$props, 'radio', 12, 'radio2');
	let check = $.prop($$props, 'check', 28, () => ['check2']);

	var $$exports = {
		get radio() {
			return radio();
		},

		set radio($$value) {
			radio($$value);
			$.flush();
		},

		get check() {
			return check();
		},

		set check($$value) {
			check($$value);
			$.flush();
		}
	};

	var fragment = root();
	var input = $.first_child(fragment);

	$.attribute_effect(input, () => ({ type: 'radio', value: 'radio1', ...{} }), void 0, void 0, void 0, void 0, true);

	var input_1 = $.sibling(input, 2);

	$.attribute_effect(input_1, () => ({ type: 'radio', value: 'radio2', ...{} }), void 0, void 0, void 0, void 0, true);

	var input_2 = $.sibling(input_1, 2);

	$.attribute_effect(input_2, () => ({ type: 'radio', value: 'radio3', ...{} }), void 0, void 0, void 0, void 0, true);

	var input_3 = $.sibling(input_2, 2);

	$.attribute_effect(input_3, () => ({ type: 'checkbox', value: 'check1', ...{} }), void 0, void 0, void 0, void 0, true);

	var input_4 = $.sibling(input_3, 2);

	$.attribute_effect(input_4, () => ({ type: 'checkbox', value: 'check2', ...{} }), void 0, void 0, void 0, void 0, true);

	var input_5 = $.sibling(input_4, 2);

	$.attribute_effect(input_5, () => ({ type: 'checkbox', value: 'check3', ...{} }), void 0, void 0, void 0, void 0, true);
	$.bind_group(binding_group, [], input, radio, radio);
	$.bind_group(binding_group, [], input_1, radio, radio);
	$.bind_group(binding_group, [], input_2, radio, radio);
	$.bind_group(binding_group_1, [], input_3, check, check);
	$.bind_group(binding_group_1, [], input_4, check, check);
	$.bind_group(binding_group_1, [], input_5, check, check);
	$.append($$anchor, fragment);

	return $.pop($$exports);
}