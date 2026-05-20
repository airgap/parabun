import * as $ from 'svelte/internal/server';

export default function Main($$renderer) {
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

	$$renderer.push(`<div></div>`);
}