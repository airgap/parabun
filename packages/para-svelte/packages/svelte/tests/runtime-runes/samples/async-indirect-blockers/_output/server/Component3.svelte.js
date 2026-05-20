import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';

export default function Component3($$renderer) {
	// Test indirect blocker dependencies
	function x() {
		return value;
	}

	function getValue() {
		return x();
	}

	function setValue(v) {
		value = v;
	}

	var value;
	var $$promises = $$renderer.run([() => 1, () => value = '']);

	$$renderer.async([$$promises[1], $$promises[1]], ($$renderer) => {
		$$renderer.push(`<input${$.attr('value', getValue())}/>`);
	});

	$$renderer.push(` <p>`);
	$$renderer.async([$$promises[1]], ($$renderer) => $$renderer.push(() => $.escape(getValue())));
	$$renderer.push(`</p>`);
}