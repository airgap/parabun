import * as $ from 'svelte/internal/server';

export default function Child($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		let testcase = $$props['testcase'];
		let value = $.fallback($$props['value'], () => ({ foo: 'kid' }), true);

		if (testcase === 'init_update') {
			value = { foo: 'kid' };
		}

		if (testcase === 'init_mutate') {
			value.foo = 'kid';
		}

		let updates = $.fallback($$props['updates'], () => [], true);

		$: if (testcase === 'reactive_update') {
			value = { foo: 'kid' };
		}

		$: if (testcase === 'reactive_mutate') {
			value.foo = 'kid';
		}

		$: updates = [...updates, value];

		$$renderer.push(`<div>child: ${$.escape(value?.foo)} | updates: ${$.escape(updates.length)}</div>`);
		$.bind_props($$props, { testcase, value, updates });
	});
}