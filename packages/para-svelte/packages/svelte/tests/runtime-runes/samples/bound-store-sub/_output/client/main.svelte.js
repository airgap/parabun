import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/client';
import { writable } from 'svelte/store';
import Child from './Child.svelte';

var root = $.add_locations($.from_html(`<!> `, 1), Main[$.FILENAME], []);

export default function Main($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, true, Main);

	const $form = () => (
		$.validate_store(form, 'form'),
		$.store_get(form, '$form', $$stores)
	);

	const [$$stores, $$cleanup] = $.setup_stores();
	let form = writable({ count: 0 });
	var $$exports = { ...$.legacy_api() };
	var fragment = root();
	var node = $.first_child(fragment);

	$.add_svelte_meta(
		() => Child(node, {
			get form() {
				$.mark_store_binding();

				return $form();
			},

			set form($$value) {
				$.store_set(form, $$value);
			}
		}),
		'component',
		Main,
		10,
		0,
		{ componentTag: 'Child' }
	);

	var text = $.sibling(node);

	$.template_effect(($0) => $.set_text(text, ` ${$0 ?? ''}`), [() => JSON.stringify($form())]);
	$.append($$anchor, fragment);

	var $$pop = $.pop($$exports);

	$$cleanup();

	return $$pop;
}