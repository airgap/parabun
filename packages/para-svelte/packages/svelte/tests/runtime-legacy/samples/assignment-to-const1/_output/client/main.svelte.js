import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<p> </p>`);

export default function Main($$anchor) {
	const arr = $.mutable_source([1, 2]);

	(($$value) => {
		var $$array = $.to_array($$value, 2);

		$.mutate(arr, $.get(arr)[0] = $$array[0]);
		$.mutate(arr, $.get(arr)[1] = $$array[1]);
	})([$.get(arr)[1], $.get(arr)[0]]);

	var p = root();
	var text = $.child(p);

	$.reset(p);
	$.template_effect(() => $.set_text(text, `${($.get(arr), $.untrack(() => $.get(arr)[0])) ?? ''}, ${($.get(arr), $.untrack(() => $.get(arr)[1])) ?? ''}`));
	$.append($$anchor, p);
}