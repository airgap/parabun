import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';

Main[$.FILENAME] = 'main.svelte';

import * as $ from 'svelte/internal/client';

const data = $.tag_proxy($.proxy({ list: [], derived: 0 }), 'data');
const derived = $.tag($.derived(() => data.list.filter(() => true)), 'derived');

const state = {
	data,
	get derived() {
		return $.get(derived);
	}
};

var root = $.add_locations($.from_html(`<button>update</button> `, 1), Main[$.FILENAME], [[20, 0]]);

export default function Main($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, true, Main);

	const $state = () => (
		$.validate_store(state, 'state'),
		$.store_get(state, '$state', $$stores)
	);

	const [$$stores, $$cleanup] = $.setup_stores();

	data.list.length = 0;
	$.inspect(() => [state], (...$$args) => console.log(...$$args), true);

	var $$exports = { ...$.legacy_api() };
	var fragment = root();
	var button = $.first_child(fragment);
	var text = $.sibling(button);

	$.template_effect(() => $.set_text(text, ` ${state.data.list ?? ''}`));

	$.delegated('click', button, function click() {
		return state.data.list.push(1);
	});

	$.append($$anchor, fragment);

	var $$pop = $.pop($$exports);

	$$cleanup();

	return $$pop;
}

$.delegate(['click']);