import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';

var root = $.from_html(`<div></div>`);

export default function Main($$anchor) {
	function test(store) {
		// allow declaring $store as parameter
		// it's not referring to the store value of the
		// `store` variable in the upper scope
		return derived(store, ($store) => {});
	}

	function test2(store) {
		// allow declaring the `$store` variable
		// it is not referring to the store value of the `store` variable
		let $store;
	}

	var div = root();

	$.event('test', div, (store) => {
		derived(store, ($store) => {});
	});

	$.event('test2', div, (store) => {
		let $store;
	});

	$.append($$anchor, div);
}