import 'svelte/internal/disclose-version';
import 'svelte/internal/flags/legacy';
import * as $ from 'svelte/internal/client';
import { onMount } from "svelte";

export default function _unknown_($$anchor, $$props) {
	$.push($$props, false);

	let prop = $.prop($$props, 'prop', 12, false);
	let propsInitialized = $.prop($$props, 'propsInitialized', 12);
	let wasCreated = $.prop($$props, 'wasCreated', 12);

	onMount(() => {
		propsInitialized(prop() !== false);
		wasCreated(true);
	});

	var $$exports = {
		get prop() {
			return prop();
		},

		set prop($$value) {
			prop($$value);
			$.flush();
		},

		get propsInitialized() {
			return propsInitialized();
		},

		set propsInitialized($$value) {
			propsInitialized($$value);
			$.flush();
		},

		get wasCreated() {
			return wasCreated();
		},

		set wasCreated($$value) {
			wasCreated($$value);
			$.flush();
		}
	};

	$.init();

	return $.pop($$exports);
}

customElements.define('my-app', $.create_custom_element(_unknown_, { prop: {}, propsInitialized: {}, wasCreated: {} }, [], [], { mode: 'open' }));