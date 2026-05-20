import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import { numbers } from './data.js';

var $$_import_numbers = $.reactive_import(() => numbers);
var root = $.from_html(`import <p> </p> local <p> </p> <button>Add a number</button>`, 1);

export default function Main($$anchor, $$props) {
	$.push($$props, false);

	const sum = $.mutable_source();
	const local_sum = $.mutable_source();
	const local_numbers = $.mutable_source([1, 2, 3, 4]);

	function addNumber() {
		$$_import_numbers($$_import_numbers()[$$_import_numbers().length] = $$_import_numbers().length + 1);
		$.mutate(local_numbers, $.get(local_numbers)[$.get(local_numbers).length] = $.get(local_numbers).length + 1);
	}

	$.legacy_pre_effect(() => ($$_import_numbers()), () => {
		$.set(sum, $$_import_numbers().reduce((t, n) => t + n, 0));
	});

	$.legacy_pre_effect(() => ($.get(local_numbers)), () => {
		$.set(local_sum, $.get(local_numbers).reduce((t, n) => t + n, 0));
	});

	$.legacy_pre_effect_reset();
	$.init();
	$.next();

	var fragment = root();
	var p = $.sibling($.first_child(fragment));
	var text = $.child(p);

	$.reset(p);

	var p_1 = $.sibling(p, 2);
	var text_1 = $.child(p_1);

	$.reset(p_1);

	var button = $.sibling(p_1, 2);

	$.template_effect(
		($0, $1) => {
			$.set_text(text, `${$0 ?? ''} = ${$.get(sum) ?? ''}`);
			$.set_text(text_1, `${$1 ?? ''} = ${$.get(local_sum) ?? ''}`);
		},
		[
			() => (
				$.deep_read_state($$_import_numbers()),
				$.untrack(() => $$_import_numbers().join(' + '))
			),

			() => (
				$.get(local_numbers),
				$.untrack(() => $.get(local_numbers).join(' + '))
			)
		]
	);

	$.event('click', button, addNumber);
	$.append($$anchor, fragment);
	$.pop();
}