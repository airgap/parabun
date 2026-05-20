import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/client';
import Test from './Test.svelte';

export default function Main($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, false, Main);

	let div = $.mutable_source();
	var $$exports = { ...$.legacy_api() };
	var fragment = $.comment();
	var node = $.first_child(fragment);

	$.add_svelte_meta(
		() => $.component(node, () => Test, ($$anchor, $$component) => {
			$$component($$anchor, {
				get div() {
					return $.get(div);
				},

				set div($$value) {
					$.set(div, $$value);
				},
				$$legacy: true
			});
		}),
		'component',
		Main,
		7,
		0,
		{ componentTag: 'svelte:component' }
	);

	$.append($$anchor, fragment);

	return $.pop($$exports);
}