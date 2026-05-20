import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/async';

Child[$.FILENAME] = 'Child.svelte';

import * as $ from 'svelte/internal/client';

var root = $.add_locations($.from_html(`<button></button> <button></button> <button></button> <button></button>`, 1), Child[$.FILENAME], [[7, 0], [17, 0], [27, 0], [37, 0]]);

export default function Child($$anchor, $$props) {
	$.check_target(new.target);
	$.push($$props, true, Child);

	const $store = () => (
		$.validate_store($$props.store, 'store'),
		$.store_get($$props.store, '$store', $$stores)
	);

	const [$$stores, $$cleanup] = $.setup_stores();
	let test = $.prop($$props, 'test', 7);
	let der = $.tag($.derived(test), 'der');
	let state = $.tag_proxy($.proxy(test()), 'state');
	var $$exports = { ...$.legacy_api() };
	var fragment = root();
	var button = $.first_child(fragment);

	var //svelte-ignore ownership_invalid_mutation
	//svelte-ignore ownership_invalid_mutation
	button_1 = $.sibling(button, 2);

	var //svelte-ignore ownership_invalid_mutation
	//svelte-ignore ownership_invalid_mutation
	button_2 = $.sibling(button_1, 2);

	var //svelte-ignore ownership_invalid_mutation
	//svelte-ignore ownership_invalid_mutation
	button_3 = $.sibling(button_2, 2);

	$.delegated('click', button, function click() {
		//svelte-ignore ownership_invalid_mutation
		test().test = Math.random();

		//svelte-ignore ownership_invalid_mutation
		test().test++;
	});

	$.delegated('click', button_1, function click_1() {
		//svelte-ignore ownership_invalid_mutation
		$.get(der).test = Math.random();

		//svelte-ignore ownership_invalid_mutation
		$.get(der).test++;
	});

	$.delegated('click', button_2, function click_2() {
		//svelte-ignore ownership_invalid_mutation
		state.test = Math.random();

		//svelte-ignore ownership_invalid_mutation
		state.test++;
	});

	$.delegated('click', button_3, function click_3() {
		//svelte-ignore ownership_invalid_mutation
		$.store_mutate($$props.store, $.untrack($store).test = Math.random(), $.untrack($store));

		//svelte-ignore ownership_invalid_mutation
		$.store_mutate($$props.store, $.untrack($store).test++, $.untrack($store));
	});

	$.append($$anchor, fragment);

	var $$pop = $.pop($$exports);

	$$cleanup();

	return $$pop;
}

$.delegate(['click']);