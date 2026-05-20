import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<select><option>wheeee</option></select>`);

export default function Main($$anchor) {
	let obj = $.mutable_source({});

	$.mutate(obj, $.get(obj).self = $.get(obj));

	let selected = $.mutable_source($.get(obj));
	var select = root();
	var option = $.child(select);
	var option_value = {};

	$.reset(select);

	$.template_effect(() => {
		if (option_value !== (option_value = $.get(obj))) {
			option.value = (option.__value = $.get(obj)) ?? '';
		}
	});

	$.bind_select_value(select, () => $.get(selected), ($$value) => $.set(selected, $$value));
	$.append($$anchor, select);
}