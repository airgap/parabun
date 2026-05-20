import 'svelte/internal/flags/async';
import * as $ from 'svelte/internal/server';

export default function Component4($$renderer) {
	// getValue is declared BEFORE x
	function getValue() {
		return x();
	}

	function x() {
		return value;
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