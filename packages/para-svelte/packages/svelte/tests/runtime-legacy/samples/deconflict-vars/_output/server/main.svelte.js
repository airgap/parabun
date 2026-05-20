import * as $ from 'svelte/internal/server';

export default function Main($$renderer, $$props) {
	$$renderer.component(($$renderer) => {
		function throwError() {
			throw new Error('nope');
		}

		const createElement = throwError;
		const createElement$ = throwError;
		let value = $.fallback($$props['value'], () => template() + template$(), true);

		function template() {
			return 'a';
		}

		function template$() {
			return 'b';
		}

		$$renderer.push(`<p>${$.escape(value)}</p>`);
		$.bind_props($$props, { value });
	});
}