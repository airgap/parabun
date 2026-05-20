import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/client';
import { writable } from 'svelte/store';
import Child from './Child.svelte';

var root = $.add_locations($.from_html(`<!> <!> <p> </p> <p> </p>`, 1), Main[$.FILENAME], [[11, 0], [12, 0]]);

export default function Main($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, true, Main);

	const $a = () => ($.validate_store(a, 'a'), $.store_get(a, '$a', $$stores));
	const $b = () => ($.validate_store(b, 'b'), $.store_get(b, '$b', $$stores));
	const [$$stores, $$cleanup] = $.setup_stores();
	let a = writable({ value: 0 });
	let b = writable({ nested: { value: 0 } });
	var $$exports = { ...$.legacy_api() };
	var fragment = root();
	var node = $.first_child(fragment);

	$.add_svelte_meta(
		() => Child(node, {
			get value() {
				return $a().value;
			},

			set value($$value) {
				$.store_mutate(a, $.untrack($a).value = $$value, $.untrack($a));
			}
		}),
		'component',
		Main,
		9,
		0,
		{ componentTag: 'Child' }
	);

	var node_1 = $.sibling(node, 2);

	$.add_svelte_meta(
		() => Child(node_1, {
			get value() {
				return $b().nested.value;
			},

			set value($$value) {
				$.store_mutate(b, $.untrack($b).nested.value = $$value, $.untrack($b));
			}
		}),
		'component',
		Main,
		10,
		0,
		{ componentTag: 'Child' }
	);

	var p = $.sibling(node_1, 2);
	var text = $.child(p, true);

	$.reset(p);

	var p_1 = $.sibling(p, 2);
	var text_1 = $.child(p_1, true);

	$.reset(p_1);

	$.template_effect(() => {
		$.set_text(text, $a().value);
		$.set_text(text_1, $b().nested.value);
	});

	$.append($$anchor, fragment);

	var $$pop = $.pop($$exports);

	$$cleanup();

	return $$pop;
}