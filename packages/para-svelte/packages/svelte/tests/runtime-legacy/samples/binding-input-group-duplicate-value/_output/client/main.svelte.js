import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<p> </p> <hr/> <input type="checkbox"/>a<br/> <input type="checkbox"/>b<br/> <input type="checkbox"/>c<br/> <input type="checkbox"/>d<br/> <hr/> <input type="checkbox"/>a<br/> <input type="checkbox"/>b<br/> <input type="checkbox"/>c<br/> <input type="checkbox"/>d<br/>`, 1);

export default function Main($$anchor) {
	const binding_group = [];
	let foo = $.mutable_source([]);
	var fragment = root();
	var p = $.first_child(fragment);
	var text = $.child(p);

	$.reset(p);

	var input = $.sibling(p, 4);

	$.remove_input_defaults(input);
	input.value = input.__value = 'a';

	var input_1 = $.sibling(input, 4);

	$.remove_input_defaults(input_1);
	input_1.value = input_1.__value = 'b';

	var input_2 = $.sibling(input_1, 4);

	$.remove_input_defaults(input_2);
	input_2.value = input_2.__value = 'c';

	var input_3 = $.sibling(input_2, 4);

	$.remove_input_defaults(input_3);
	input_3.value = input_3.__value = 'd';

	var input_4 = $.sibling(input_3, 6);

	$.remove_input_defaults(input_4);
	input_4.value = input_4.__value = 'a';

	var input_5 = $.sibling(input_4, 4);

	$.remove_input_defaults(input_5);
	input_5.value = input_5.__value = 'b';

	var input_6 = $.sibling(input_5, 4);

	$.remove_input_defaults(input_6);
	input_6.value = input_6.__value = 'c';

	var input_7 = $.sibling(input_6, 4);

	$.remove_input_defaults(input_7);
	input_7.value = input_7.__value = 'd';
	$.next(2);
	$.template_effect(() => $.set_text(text, `Checked: ${$.get(foo) ?? ''}`));
	$.bind_group(binding_group, [], input, () => $.get(foo), ($$value) => $.set(foo, $$value));
	$.bind_group(binding_group, [], input_1, () => $.get(foo), ($$value) => $.set(foo, $$value));
	$.bind_group(binding_group, [], input_2, () => $.get(foo), ($$value) => $.set(foo, $$value));
	$.bind_group(binding_group, [], input_3, () => $.get(foo), ($$value) => $.set(foo, $$value));
	$.bind_group(binding_group, [], input_4, () => $.get(foo), ($$value) => $.set(foo, $$value));
	$.bind_group(binding_group, [], input_5, () => $.get(foo), ($$value) => $.set(foo, $$value));
	$.bind_group(binding_group, [], input_6, () => $.get(foo), ($$value) => $.set(foo, $$value));
	$.bind_group(binding_group, [], input_7, () => $.get(foo), ($$value) => $.set(foo, $$value));
	$.append($$anchor, fragment);
}