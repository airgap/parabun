import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/client';
import { writable } from 'svelte/store';

var root_1 = $.add_locations($.from_html(`<div><input/></div>`), Main[$.FILENAME], [[9, 1, [[9, 6]]]]);

export default function Main($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, true, Main);

	const $array = () => (
		$.validate_store(array, 'array'),
		$.store_get(array, '$array', $$stores)
	);

	const [$$stores, $$cleanup] = $.setup_stores();
	const array = writable([{ name: "" }]);
	var $$exports = { ...$.legacy_api() };
	var fragment = $.comment();
	var node = $.first_child(fragment);

	$.add_svelte_meta(
		() => $.each(node, 1, $array, $.index, ($$anchor, item, $$index) => {
			var div = root_1();
			var input = $.child(div);

			$.remove_input_defaults(input);
			$.validate_binding('bind:value={item.name}', [], () => ($.mark_store_binding(), $.get(item)), () => 'name', 9, 13);
			$.reset(div);

			$.bind_value(
				input,
				function get() {
					return $.get(item).name;
				},
				function set($$value) {
					(
						$.get(item).name = $$value,
						$.invalidate_store($$stores, '$array')
					);
				}
			);

			$.append($$anchor, div);
		}),
		'each',
		Main,
		8,
		0
	);

	$.append($$anchor, fragment);

	var $$pop = $.pop($$exports);

	$$cleanup();

	return $$pop;
}